/**
 * 飞书 OAuth + Session（HMAC 签名 cookie）
 *
 * 流程：
 *   1. /api/auth/feishu/start → 302 跳飞书 authorize 页
 *   2. 飞书回调 /api/auth/feishu/callback?code=xxx&state=xxx
 *   3. 后端用 code 换 user_access_token，再拿用户信息 (union_id / name / email / mobile)
 *   4. 写 HTTP-only cookie session (HMAC 签名)
 */

import crypto from 'node:crypto';

const FEISHU_BASE = process.env.FEISHU_OPEN_BASE ?? 'https://open.feishu.cn';
const SESSION_COOKIE = 'rsm_session';
const STATE_COOKIE = 'rsm_oauth_state';
const SESSION_TTL_SEC = 24 * 3600; // 24h

export type SessionPayload = {
  union_id: string;
  open_id: string;
  name: string;
  email?: string;
  mobile?: string;
  avatar_url?: string;
  exp: number; // unix seconds
};

// ============= cookie 签名 =============

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET 未配置或长度不足 16 字节');
  }
  return s;
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function signSession(data: SessionPayload): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as SessionPayload;
    if (!data.union_id || !data.exp) return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readSessionFromCookie(cookieHeader: string | null): SessionPayload | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!m) return null;
  return verifySession(m[1]);
}

// ============= OAuth state（防 CSRF） =============

export function makeState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function stateCookieHeader(state: string): string {
  return `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function readStateFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`${STATE_COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}

// ============= 飞书 OAuth API =============

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const appId = process.env.FEISHU_APP_ID;
  if (!appId) throw new Error('FEISHU_APP_ID 未配置');
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: '', // 默认 scope 包含 user_info
  });
  return `${FEISHU_BASE}/open-apis/authen/v1/authorize?${params}`;
}

/** 拿 app_access_token（用于 OAuth code 兑换 user_access_token，自建应用同 tenant_access_token 接口）*/
async function getAppAccessToken(): Promise<string> {
  const r = await fetch(`${FEISHU_BASE}/open-apis/auth/v3/app_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });
  const j = (await r.json()) as { code?: number; msg?: string; app_access_token?: string };
  if (j.code !== 0 || !j.app_access_token) {
    throw new Error(`app_access_token failed: code=${j.code} msg=${j.msg}`);
  }
  return j.app_access_token;
}

/** code → user_access_token → user_info */
export async function exchangeCodeForUser(code: string): Promise<SessionPayload> {
  const appToken = await getAppAccessToken();

  // Step 1: code → user_access_token
  const tokR = await fetch(`${FEISHU_BASE}/open-apis/authen/v1/oidc/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appToken}`,
    },
    body: JSON.stringify({ grant_type: 'authorization_code', code }),
  });
  const tokJ = (await tokR.json()) as {
    code?: number;
    msg?: string;
    data?: { access_token?: string; open_id?: string };
  };
  if (tokJ.code !== 0 || !tokJ.data?.access_token) {
    throw new Error(`oidc/access_token failed: code=${tokJ.code} msg=${tokJ.msg}`);
  }

  // Step 2: user_access_token → user_info
  const userR = await fetch(`${FEISHU_BASE}/open-apis/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${tokJ.data.access_token}` },
  });
  const userJ = (await userR.json()) as {
    code?: number;
    msg?: string;
    data?: {
      union_id?: string;
      open_id?: string;
      name?: string;
      email?: string;
      mobile?: string;
      avatar_url?: string;
    };
  };
  if (userJ.code !== 0 || !userJ.data?.union_id) {
    throw new Error(`user_info failed: code=${userJ.code} msg=${userJ.msg}`);
  }

  return {
    union_id: userJ.data.union_id,
    open_id: userJ.data.open_id ?? '',
    name: userJ.data.name ?? '',
    email: userJ.data.email,
    mobile: userJ.data.mobile,
    avatar_url: userJ.data.avatar_url,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  };
}

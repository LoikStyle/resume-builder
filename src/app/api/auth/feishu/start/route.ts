import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, makeState, stateCookieHeader } from '@/lib/feishu-auth';
import { checkRate, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!checkRate(`oauth-start:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'rate limit' }, { status: 429 });
  }

  // redirect_uri 必须跟飞书后台「重定向 URL」严格一致
  // 优先用 PUBLIC_BASE_URL（环境变量），兜底用 request 推算
  let redirectUri = process.env.PUBLIC_BASE_URL;
  if (redirectUri) {
    redirectUri = `${redirectUri.replace(/\/$/, '')}/api/auth/feishu/callback`;
  } else {
    const url = new URL(req.url);
    const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    redirectUri = `${proto}://${host}${basePath}/api/auth/feishu/callback`;
  }

  const state = makeState();
  const authorizeUrl = buildAuthorizeUrl(redirectUri, state);

  const headers = new Headers();
  headers.set('location', authorizeUrl);
  headers.append('set-cookie', stateCookieHeader(state));
  return new NextResponse(null, { status: 302, headers });
}

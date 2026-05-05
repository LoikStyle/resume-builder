/**
 * 飞书多维表格写入封装
 *
 * 写入模式（按可用凭证自动切换）：
 *   1. 直连模式（FEISHU_APP_ID + FEISHU_APP_SECRET）：fetch 飞书 OpenAPI（推荐，0 spawn 开销）
 *   2. 本地 lark-cli 模式（兜底，开发期）
 *   3. 中转模式（FEISHU_BITABLE_PUSH_URL）：POST 到腾讯云中转脚本
 */

import { spawn } from 'node:child_process';

const BASE_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN ?? 'QS4Hb5p46aAO00stbsRcLNuGnQg';
const TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID ?? 'tblqcR6ych4MH9at';
const FEISHU_BASE = process.env.FEISHU_OPEN_BASE ?? 'https://open.feishu.cn';

export type FeishuPushResult = {
  mode: 'feishu-direct' | 'feishu-local-cli' | 'feishu-relay';
  record_id: string;
  raw?: unknown;
};

/** 把表单 payload 转成飞书多维表格 record fields（key 是飞书列名） */
export function toBitableFields(payload: {
  basicInfo: Record<string, string>;
  intakeAnswers: {
    projectDirection?: string;
    courseProjectGroups?: string[];
    courseProjects: string[];
    industryCategory: string;
    industrySubtags?: string[];
    aiIndustryYears: string;
    highlightFields: string[];
  };
}): Record<string, unknown> {
  const { basicInfo: b, intakeAnswers: i } = payload;
  return {
    学生姓名: b.name,
    手机: b.phone,
    邮箱: b.email,
    毕业院校: b.school,
    专业: b.major,
    毕业时间: b.graduation,
    模型方向: i.projectDirection ?? '',
    项目类别: i.courseProjectGroups ?? [],
    做过的项目: i.courseProjects,
    行业大类: i.industryCategory,
    专业方向: i.industrySubtags ?? [],
    'AI 行业年限': i.aiIndustryYears,
    高亮字段: i.highlightFields,
  };
}

/** 过滤出非空字段；所有数组统一存 JSON 字面量字符串（如 ["A","B"]）方便下游解析 */
function sanitizeFields(fields: Record<string, unknown>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      safe[k] = JSON.stringify(v);
    } else {
      safe[k] = String(v);
    }
  }
  return safe;
}

// ==================== 直连模式 ====================

let cachedToken: { value: string; expireAt: number } | null = null;

/** 拿 tenant_access_token，2h 内复用；过期前 60s 自动刷新 */
async function getTenantAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expireAt > now) return cachedToken.value;

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) throw new Error('FEISHU_DIRECT_NOT_CONFIGURED');

  const r = await fetch(`${FEISHU_BASE}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const j = (await r.json()) as { code?: number; msg?: string; tenant_access_token?: string; expire?: number };
  if (j.code !== 0 || !j.tenant_access_token) {
    throw new Error(`tenant_access_token failed: code=${j.code} msg=${j.msg}`);
  }
  const expireSec = j.expire ?? 7200;
  cachedToken = { value: j.tenant_access_token, expireAt: now + (expireSec - 60) * 1000 };
  return cachedToken.value;
}

/** 按手机号查飞书表已有记录数（用于"每人最多 3 次提交"硬限制）*/
export async function countRecordsByPhone(phone: string): Promise<number> {
  if (!phone || !process.env.FEISHU_APP_ID) return 0;
  try {
    const token = await getTenantAccessToken();
    const url = `${FEISHU_BASE}/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/search?page_size=20`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [{ field_name: '手机', operator: 'is', value: [phone] }],
        },
        automatic_fields: false,
      }),
    });
    const j = (await r.json()) as { code?: number; data?: { items?: unknown[] } };
    if (j.code !== 0) return 0;
    return (j.data?.items ?? []).length;
  } catch {
    return 0; // 查询失败别阻塞写入
  }
}

/** 模式 1：fetch 直连飞书 OpenAPI（推荐，0 spawn 开销） */
export async function pushDirect(fields: Record<string, unknown>): Promise<FeishuPushResult> {
  const token = await getTenantAccessToken();
  const url = `${FEISHU_BASE}/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: sanitizeFields(fields) }),
  });
  const j = (await r.json()) as {
    code?: number;
    msg?: string;
    data?: { record?: { record_id?: string } };
  };
  if (j.code !== 0) {
    throw new Error(`Bitable direct write: code=${j.code} msg=${j.msg}`);
  }
  return {
    mode: 'feishu-direct',
    record_id: j.data?.record?.record_id ?? 'unknown',
    raw: j,
  };
}

/** 更新已有 Bitable 记录（用于回填 AI 生成内容） */
export async function updateBitableRecord(
  recordId: string,
  fields: Record<string, string>
): Promise<void> {
  if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
    const token = await getTenantAccessToken();
    const url = `${FEISHU_BASE}/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`;
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields }),
    });
    const j = (await r.json()) as { code?: number; msg?: string };
    if (j.code !== 0) throw new Error(`Bitable update direct: code=${j.code} msg=${j.msg}`);
    return;
  }

  // 兜底：本地 lark-cli
  const larkCli = process.env.LARK_CLI_PATH ?? 'lark-cli';
  const tablePath = `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`;
  return new Promise((resolve, reject) => {
    const proc = spawn(
      larkCli,
      ['api', 'PUT', tablePath, '--data', JSON.stringify({ fields })],
      { stdio: ['pipe', 'pipe', 'pipe'], timeout: 30_000 }
    );
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`lark-cli update exit ${code}: ${stderr.slice(0, 300)}`));
      try {
        const result = JSON.parse(stdout);
        if (result.code !== 0) return reject(new Error(`Bitable update error: ${result.code} ${result.msg}`));
        resolve();
      } catch {
        resolve();
      }
    });
    proc.on('error', (err) => reject(new Error(`lark-cli update 启动失败: ${err.message}`)));
  });
}

// ==================== 兜底：本地 lark-cli ====================

export async function pushLocalCli(
  fields: Record<string, unknown>
): Promise<FeishuPushResult> {
  const larkCli = process.env.LARK_CLI_PATH ?? 'lark-cli';
  const tablePath = `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records`;

  return new Promise((resolve, reject) => {
    const proc = spawn(larkCli, ['api', 'POST', tablePath, '--data', JSON.stringify({ fields: sanitizeFields(fields) })], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30_000,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`lark-cli exit ${code}: ${stderr.slice(0, 500)}`));
      }
      try {
        const result = JSON.parse(stdout);
        if (result.code !== 0) {
          return reject(new Error(`Bitable API error: ${result.code} ${result.msg ?? ''}`));
        }
        resolve({
          mode: 'feishu-local-cli',
          record_id: result.data?.record?.record_id ?? 'unknown',
          raw: result,
        });
      } catch {
        reject(new Error(`lark-cli 返回非 JSON: ${stdout.slice(0, 200)}`));
      }
    });

    proc.on('error', (err) => reject(new Error(`lark-cli 启动失败: ${err.message}`)));
  });
}

// ==================== 兜底：服务器中转 ====================

export async function pushRelay(
  fields: Record<string, unknown>
): Promise<FeishuPushResult> {
  const relayUrl = process.env.FEISHU_BITABLE_PUSH_URL;
  if (!relayUrl) throw new Error('FEISHU_RELAY_NOT_CONFIGURED');

  const resp = await fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`relay push failed ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const j = (await resp.json()) as { record_id?: string };
  return {
    mode: 'feishu-relay',
    record_id: j.record_id ?? 'unknown',
    raw: j,
  };
}

// ==================== 自动选模式 ====================

/** 优先 fetch 直连 → lark-cli 兜底 → relay 兜底 → 抛错 */
export async function pushToBitable(
  fields: Record<string, unknown>
): Promise<FeishuPushResult> {
  if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
    return pushDirect(fields);
  }
  try {
    return await pushLocalCli(fields);
  } catch (_) {
    // 失败再尝试 relay
  }
  if (process.env.FEISHU_BITABLE_PUSH_URL) {
    return pushRelay(fields);
  }
  throw new Error('FEISHU_NOT_CONFIGURED');
}

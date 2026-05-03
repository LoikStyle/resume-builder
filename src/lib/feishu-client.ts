/**
 * 飞书多维表格写入封装
 *
 * 模式（按可用凭证自动切换）：
 *   1. 直连模式（FEISHU_APP_ID + FEISHU_APP_SECRET 都有）：拿 tenant_access_token → 写 record
 *   2. 中转模式（仅 FEISHU_BITABLE_PUSH_URL 有）：POST 到腾讯云中转脚本，由它复用 lark-cli token
 *   3. fallback：抛错让 route 走 JSON 下载 fallback
 */

const FEISHU_BASE = process.env.FEISHU_BASE_URL ?? 'https://open.feishu.cn';

export type FeishuPushResult = {
  mode: 'feishu-direct' | 'feishu-relay';
  record_id: string;
  raw?: unknown;
};

/** 把表单 payload 转成飞书多维表格 record fields（key 是飞书列名） */
export function toBitableFields(payload: {
  basicInfo: Record<string, string>;
  intakeAnswers: {
    industryCategory: string;
    subScenarios: string[];
    courseProjects: string[];
    pathwayScene?: string;
    modelsTools: string[];
    aiIndustryYears: string;
    resumeStructure: string;
    highlightFields: string[];
  };
  scenario: string;
}): Record<string, unknown> {
  const { basicInfo: b, intakeAnswers: i, scenario } = payload;
  return {
    学生姓名: b.name,
    手机: b.phone,
    邮箱: b.email,
    毕业院校: b.school,
    专业: b.major,
    毕业时间: b.graduation,
    行业大类: i.industryCategory,
    细分场景: i.subScenarios.join('；'),
    课程项目: i.courseProjects,
    路演场景: i.pathwayScene ?? '',
    模型工具: i.modelsTools,
    'AI 行业年限': i.aiIndustryYears,
    简历结构偏好: i.resumeStructure,
    高亮字段: i.highlightFields,
    学生原始描述: scenario,
  };
}

/** 模式 1：直连飞书 OpenAPI（需要 FEISHU_APP_ID/SECRET）*/
export async function pushDirect(
  fields: Record<string, unknown>
): Promise<FeishuPushResult> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
  const tableId = process.env.FEISHU_BITABLE_TABLE_ID;

  if (!appId || !appSecret || !appToken || !tableId) {
    throw new Error('FEISHU_DIRECT_NOT_CONFIGURED');
  }

  // 1. 拿 tenant_access_token
  const tokenResp = await fetch(
    `${FEISHU_BASE}/open-apis/auth/v3/tenant_access_token/internal`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  );
  const tokenJson = (await tokenResp.json()) as {
    tenant_access_token?: string;
    code?: number;
    msg?: string;
  };
  if (!tokenJson.tenant_access_token) {
    throw new Error(`feishu auth failed: ${tokenJson.code ?? '?'} ${tokenJson.msg ?? ''}`);
  }

  // 2. 写 record
  const writeResp = await fetch(
    `${FEISHU_BASE}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenJson.tenant_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );
  const writeJson = (await writeResp.json()) as {
    code?: number;
    msg?: string;
    data?: { record?: { record_id?: string } };
  };
  if (writeJson.code && writeJson.code !== 0) {
    throw new Error(`feishu bitable write failed: ${writeJson.code} ${writeJson.msg}`);
  }

  return {
    mode: 'feishu-direct',
    record_id: writeJson.data?.record?.record_id ?? 'unknown',
    raw: writeJson,
  };
}

/** 模式 2：中转模式——POST 到腾讯云上的 push 脚本（复用 lark-cli token）*/
export async function pushRelay(
  fields: Record<string, unknown>
): Promise<FeishuPushResult> {
  const relayUrl = process.env.FEISHU_BITABLE_PUSH_URL;
  const relayToken = process.env.FEISHU_BITABLE_PUSH_TOKEN ?? '';

  if (!relayUrl) {
    throw new Error('FEISHU_RELAY_NOT_CONFIGURED');
  }

  const resp = await fetch(relayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(relayToken ? { Authorization: `Bearer ${relayToken}` } : {}),
    },
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

/** 自动选模式：直连 → 中转 → 抛错让 route fallback 走 JSON 下载 */
export async function pushToBitable(
  fields: Record<string, unknown>
): Promise<FeishuPushResult> {
  if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
    return pushDirect(fields);
  }
  if (process.env.FEISHU_BITABLE_PUSH_URL) {
    return pushRelay(fields);
  }
  throw new Error('FEISHU_NOT_CONFIGURED');
}

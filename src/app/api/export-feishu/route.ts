import { NextRequest, NextResponse } from 'next/server';
import { pushToBitable, toBitableFields, countRecordsByPhone } from '@/lib/feishu-client';
import { readSessionFromCookie } from '@/lib/feishu-auth';
import { checkRate, clientIp, checkOrigin, maybeCleanup } from '@/lib/rate-limit';
import { validateBasicInfo, enforceLength, type BasicInfo } from '@/lib/validators';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SUBMIT_LIMIT_PER_USER = 3;

export async function POST(req: NextRequest) {
  maybeCleanup();

  // 1. Origin 校验（防外站直接 POST）
  if (!checkOrigin(req)) {
    return NextResponse.json({ error: '非法来源' }, { status: 403 });
  }

  // 2. IP rate limit（5 次/分钟，应付正常 3 次提交 + 余量）
  const ip = clientIp(req);
  if (!checkRate(`feishu:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: '提交太频繁，请稍后再试' }, { status: 429 });
  }

  // 3. 必须登录飞书
  const session = readSessionFromCookie(req.headers.get('cookie'));
  if (!session) {
    return NextResponse.json({ error: '请先登录飞书账号', needLogin: true }, { status: 401 });
  }

  // 4. 解 body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'body 不是有效 JSON' }, { status: 400 });
  }
  const b = body as {
    intakeAnswers?: unknown;
    basicInfo?: BasicInfo;
    _honeypot?: string;
  };

  // 5. honeypot：填了视为机器人
  if (b._honeypot && String(b._honeypot).trim()) {
    return NextResponse.json({ error: 'bot detected' }, { status: 400 });
  }

  const intakeAnswers = b.intakeAnswers as Parameters<typeof toBitableFields>[0]['intakeAnswers'];
  const basicInfo = (b.basicInfo as BasicInfo | undefined) ?? {};

  if (!intakeAnswers || !basicInfo.name) {
    return NextResponse.json({ error: '缺少 intakeAnswers 或 basicInfo.name' }, { status: 400 });
  }

  // 6. 字段长度硬上限（防大字段攻击）
  const lenErr = enforceLength(basicInfo);
  if (lenErr) {
    return NextResponse.json({ error: lenErr }, { status: 400 });
  }

  // 7. 字段格式校验（前端校验过，这里二次防绕）
  const fieldErrors = validateBasicInfo(basicInfo);
  if (fieldErrors.length > 0) {
    return NextResponse.json(
      { error: fieldErrors[0].error, fieldErrors },
      { status: 400 }
    );
  }

  // 8. 同 union_id 已提交 ≥ 3 次 → 拒绝（用 IP+union_id 复合 key 应用层快速判，飞书表 source of truth）
  const userKey = `submitcount:${session.union_id}`;
  if (!checkRate(userKey, SUBMIT_LIMIT_PER_USER, 365 * 24 * 3600 * 1000)) {
    return NextResponse.json(
      { error: `已达提交上限（${SUBMIT_LIMIT_PER_USER} 次），如需修改请联系老师` },
      { status: 403 }
    );
  }

  // 9. 后端真去重：按手机号查飞书表（防同一人换浏览器/清缓存）
  if (basicInfo.phone) {
    const existed = await countRecordsByPhone(basicInfo.phone);
    if (existed >= SUBMIT_LIMIT_PER_USER) {
      return NextResponse.json(
        { error: `该手机号已提交 ${existed} 次，达上限。如需修改请联系老师` },
        { status: 403 }
      );
    }
  }

  // 10. 写飞书
  const fields = toBitableFields({ basicInfo: basicInfo as Record<string, string>, intakeAnswers });
  // 加 union_id 到飞书（要求飞书表加一列「飞书 union_id」否则该列不写入）
  (fields as Record<string, unknown>)['飞书ID'] = session.union_id;

  try {
    const result = await pushToBitable(fields);
    return NextResponse.json({ mode: result.mode, record_id: result.record_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg === 'FEISHU_NOT_CONFIGURED' ||
      msg === 'FEISHU_DIRECT_NOT_CONFIGURED' ||
      msg === 'FEISHU_RELAY_NOT_CONFIGURED'
    ) {
      return NextResponse.json({ error: '飞书未配置，请联系管理员' }, { status: 500 });
    }
    console.error('[export-feishu] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

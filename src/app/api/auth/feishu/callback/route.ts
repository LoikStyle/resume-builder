import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForUser,
  signSession,
  sessionCookieHeader,
  readStateFromCookie,
} from '@/lib/feishu-auth';
import { checkRate, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!checkRate(`oauth-cb:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'rate limit' }, { status: 429 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';

  if (!code || !state) {
    return NextResponse.json({ error: '缺 code/state' }, { status: 400 });
  }
  const expected = readStateFromCookie(req.headers.get('cookie'));
  if (!expected || expected !== state) {
    return NextResponse.json({ error: 'state 校验失败' }, { status: 400 });
  }

  try {
    const user = await exchangeCodeForUser(code);
    const token = signSession(user);

    const headers = new Headers();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    headers.set('location', `${basePath}/intake`);
    headers.append('set-cookie', sessionCookieHeader(token));
    headers.append('set-cookie', `rsm_oauth_state=; Path=/; Max-Age=0`);
    return new NextResponse(null, { status: 302, headers });
  } catch (e) {
    console.error('[oauth callback]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'oauth 失败' },
      { status: 500 }
    );
  }
}

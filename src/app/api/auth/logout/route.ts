import { NextResponse } from 'next/server';
import { clearSessionCookieHeader } from '@/lib/feishu-auth';

export const runtime = 'nodejs';

export async function POST() {
  const headers = new Headers();
  headers.append('set-cookie', clearSessionCookieHeader());
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...Object.fromEntries(headers), 'content-type': 'application/json' },
  });
}

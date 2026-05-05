import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromCookie } from '@/lib/feishu-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = readSessionFromCookie(req.headers.get('cookie'));
  if (!session) {
    return NextResponse.json({ loggedIn: false });
  }
  return NextResponse.json({
    loggedIn: true,
    user: {
      union_id: session.union_id,
      name: session.name,
      email: session.email,
      mobile: session.mobile,
      avatar_url: session.avatar_url,
    },
  });
}

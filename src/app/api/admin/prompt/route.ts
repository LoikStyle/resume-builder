import { NextRequest, NextResponse } from 'next/server';
import {
  loadPromptTemplate,
  savePromptTemplate,
  type PromptKind,
} from '@/lib/prompts/subscenarios-prompt';
import { checkRate, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function checkAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return provided === expected;
}

function parseKind(raw: string | null): PromptKind {
  return raw === 'aesthetic' ? 'aesthetic' : 'main';
}

export async function GET(req: NextRequest) {
  if (!checkRate(`admin:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'rate limit' }, { status: 429 });
  }
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const kind = parseKind(url.searchParams.get('kind'));
  try {
    const template = await loadPromptTemplate(kind);
    return NextResponse.json({ template, kind });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'load failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!checkRate(`admin:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'rate limit' }, { status: 429 });
  }
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const body = (await req.json()) as { template?: string; kind?: PromptKind };
    const kind = parseKind(body.kind ?? 'main');
    if (typeof body.template !== 'string' || body.template.trim().length < 50) {
      return NextResponse.json(
        { error: 'template 必须是字符串且长度 ≥ 50' },
        { status: 400 }
      );
    }
    if (!body.template.includes('{{CATEGORY}}') || !body.template.includes('{{TARGET_COUNT}}')) {
      return NextResponse.json(
        { error: 'template 必须包含 {{CATEGORY}} 和 {{TARGET_COUNT}} 占位符' },
        { status: 400 }
      );
    }
    await savePromptTemplate(body.template, kind);
    return NextResponse.json({ ok: true, kind });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'save failed' },
      { status: 500 }
    );
  }
}

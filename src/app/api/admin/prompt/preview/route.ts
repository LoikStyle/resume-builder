import { NextRequest, NextResponse } from 'next/server';
import { extractJson } from '@/lib/claude-client';
import { callOpenAI, AIhubmixError } from '@/lib/aihubmix-client';
import {
  fillPromptTemplate,
  TARGET_COUNT_DEFAULT,
} from '@/lib/prompts/subscenarios-prompt';
import { checkRate, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

function checkAdmin(req: NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const auth = req.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return provided === expected;
}

export async function POST(req: NextRequest) {
  if (!checkRate(`admin-preview:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'rate limit' }, { status: 429 });
  }
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = req.headers.get('x-api-key') || '';
  const baseUrl = req.headers.get('x-base-url') || 'https://aihubmix.com/v1';
  const model = req.headers.get('x-model') || 'gpt-4o-mini';

  if (!apiKey) {
    return NextResponse.json(
      { error: '缺 AIhubmix API key——请先在 intake 页【设置】里填' },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as {
      template?: string;
      category?: string;
      direction?: string;
      subtags?: string[];
      courseProjects?: string[];
      targetCount?: number;
    };

    const template = String(body.template ?? '').trim();
    const category = String(body.category ?? '').trim();
    if (!template || !category) {
      return NextResponse.json({ error: '缺 template 或 category' }, { status: 400 });
    }

    const prompt = fillPromptTemplate(template, {
      category,
      direction: String(body.direction ?? ''),
      subtags: body.subtags ?? [],
      courseProjects: body.courseProjects ?? [],
      targetCount: body.targetCount ?? TARGET_COUNT_DEFAULT,
    });

    const text = await callOpenAI({
      apiKey,
      baseUrl,
      model,
      prompt,
      temperature: 0.6,
      maxTokens: 4000,
      signal: req.signal,
    });

    let subscenarios: unknown;
    try {
      subscenarios = extractJson(text);
    } catch {
      return NextResponse.json({ error: '模型返回非 JSON', raw: text.slice(0, 500) }, { status: 500 });
    }

    return NextResponse.json({ subscenarios, prompt });
  } catch (e) {
    if (e instanceof AIhubmixError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'preview failed' },
      { status: 500 }
    );
  }
}

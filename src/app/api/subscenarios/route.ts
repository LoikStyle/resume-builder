import { NextRequest, NextResponse } from 'next/server';
import { extractJson } from '@/lib/claude-client';
import { callOpenAI, AIhubmixError } from '@/lib/aihubmix-client';
import { buildSubscenariosPrompt, TARGET_COUNT_DEFAULT } from '@/lib/prompts/subscenarios-prompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Subscenario = {
  name: string;
  description: string;
  core_dimensions: string[];
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key') || '';
    const baseUrl = req.headers.get('x-base-url') || 'https://aihubmix.com/v1';
    const model = req.headers.get('x-model') || 'gpt-4o-mini';

    if (!apiKey) {
      return NextResponse.json(
        { error: '未检测到 API key——请点右上角【设置】填写 AIhubmix key', missingKey: true },
        { status: 401 }
      );
    }

    const body = await req.json();
    const category = String(body.category ?? '').trim();
    const direction = String(body.direction ?? '').trim();
    const subtags = Array.isArray(body.subtags) ? (body.subtags as string[]) : [];
    const courseProjects = Array.isArray(body.courseProjects)
      ? (body.courseProjects as string[])
      : [];
    if (!category) {
      return NextResponse.json({ error: '缺少 category' }, { status: 400 });
    }

    const prompt = await buildSubscenariosPrompt({
      category,
      direction,
      subtags,
      courseProjects,
      targetCount: TARGET_COUNT_DEFAULT,
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

    const subscenarios = extractJson<Subscenario[]>(text);

    if (!Array.isArray(subscenarios) || subscenarios.length === 0) {
      return NextResponse.json(
        { error: '模型未返回有效的场景数组', raw: text.slice(0, 500) },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscenarios });
  } catch (e) {
    if (e instanceof AIhubmixError) {
      return NextResponse.json(
        { error: e.message, missingKey: e.status === 401, retryable: e.status === 429 },
        { status: e.status }
      );
    }
    console.error('[subscenarios] error:', e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : '生成失败',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

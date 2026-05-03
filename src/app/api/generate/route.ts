import { NextRequest, NextResponse } from 'next/server';
import { runRetrievalWorkflow } from '@/lib/coze-client';
import { callClaude, extractJson } from '@/lib/claude-client';
import { buildGeneratePrompt } from '@/lib/prompts/generate-resume';
import { ResumeSchema } from '@/lib/schema/resume';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenario = String(body.scenario ?? '').trim();
    const intakeAnswers = body.intakeAnswers as Record<string, unknown>;
    const basicInfo = (body.basicInfo as Record<string, string> | undefined) ?? {};

    if (!scenario || !intakeAnswers) {
      return NextResponse.json(
        { error: '缺少 scenario 或 intakeAnswers' },
        { status: 400 }
      );
    }

    // 段 1：扣子检索（未配置时自动 mock）
    const retrieval = await runRetrievalWorkflow({ scenario, intakeAnswers });

    // 段 2：Claude 生成 + Zod 校验（最多重试 1 次）
    const prompt = buildGeneratePrompt({
      scenario,
      intakeAnswers: intakeAnswers as never,
      basicInfo,
      ruleFragments: retrieval.ruleFragments,
      jdBlocks: retrieval.jdBlocks,
      structureSample: retrieval.structureSample,
    });

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await callClaude(prompt);
        const raw = extractJson(text);
        const result = ResumeSchema.safeParse(raw);
        if (result.success) {
          return NextResponse.json({ resume: result.data });
        }
        lastError = result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('\n');
        console.warn(`[generate] attempt ${attempt + 1} schema 校验失败:\n`, lastError);
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.warn(`[generate] attempt ${attempt + 1} 异常:`, lastError);
      }
    }

    return NextResponse.json(
      { error: `Claude 生成失败：${lastError}` },
      { status: 500 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '未知错误' },
      { status: 500 }
    );
  }
}

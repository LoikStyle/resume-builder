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

    // V2：取消失败重试——每次重试 + 几分钟，用户体验差。失败直接返回，让前端重新提交
    try {
      const text = await callClaude(prompt);
      const raw = extractJson(text);
      const result = ResumeSchema.safeParse(raw);
      if (result.success) {
        return NextResponse.json({ resume: result.data });
      }
      const issues = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('\n');
      console.warn('[generate] schema 校验失败:\n', issues);
      return NextResponse.json(
        { error: `生成的 JSON 不符合 schema：\n${issues}`, raw },
        { status: 500 }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[generate] Claude 调用异常:', msg);
      return NextResponse.json({ error: `Claude 调用失败：${msg}` }, { status: 500 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '未知错误' },
      { status: 500 }
    );
  }
}

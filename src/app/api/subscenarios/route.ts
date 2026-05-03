import { NextRequest, NextResponse } from 'next/server';
import { callClaude, extractJson } from '@/lib/claude-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Subscenario = { name: string; description: string };

const PROMPT = `为"{{category}}"行业列出 12 个 AI 训练师 / 评测岗常见的细分应用场景。

要求：
- 每个场景一句话描述（不超过 20 字）
- 覆盖：内容生成 / 评测 / 对话 / 推荐 / 风控 / 多模态 等子方向
- 名称要具体到能写进简历项目名，不要笼统（如"AI 应用"这种空话）
- 优先列学生在课程里能做出 demo 的场景

输出严格 JSON 数组，不要任何说明、不要 markdown 代码块：
[{"name":"...","description":"..."}, ...]`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const category = String(body.category ?? '').trim();
    if (!category) {
      return NextResponse.json({ error: '缺少 category' }, { status: 400 });
    }

    const prompt = PROMPT.replace('{{category}}', category);

    // 用 haiku 4.5（比 sonnet 快 5x，分类任务质量足够）
    // 实测冷启动后 ~48s，留 120s 余量
    const text = await callClaude(prompt, {
      model: 'claude-haiku-4-5-20251001',
      timeoutMs: 120_000,
    });
    const subscenarios = extractJson<Subscenario[]>(text);

    if (!Array.isArray(subscenarios) || subscenarios.length === 0) {
      return NextResponse.json(
        { error: 'Claude 未返回有效的场景数组', raw: text.slice(0, 500) },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscenarios });
  } catch (e) {
    console.error('[subscenarios] error:', e);
    // fallback：失败时给一份兜底
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : '生成失败',
        subscenarios: FALLBACK_BY_CATEGORY('其他'),
      },
      { status: 500 }
    );
  }
}

/** 兜底列表（API 失败时前端可用） */
function FALLBACK_BY_CATEGORY(_cat: string): Subscenario[] {
  return [
    { name: '内容生成评测', description: '文案 / 短视频 / 图文质量横评' },
    { name: 'Bad Case 拦截', description: '高频问题归因与拒答策略迭代' },
    { name: 'SFT 数据生产', description: '单轮 / 多轮对话标注' },
    { name: '多模型横评', description: '5+ 款主流模型对比报告' },
    { name: '规则文档撰写', description: '标注规范 + 正反 case' },
    { name: '评测维度设计', description: '4-5 维度评分体系搭建' },
  ];
}

import { NextRequest, NextResponse } from 'next/server';
import { callClaude, extractJson } from '@/lib/claude-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Subscenario = { name: string; description: string };

/**
 * V3.2 prompt：基于"行业 ∩ 学生项目"交集生成场景，禁止纯业务向
 */
function buildPrompt(category: string, courseProjects: string[]): string {
  const projects = courseProjects.length
    ? courseProjects.map((p) => `- ${p}`).join('\n')
    : '（学生还没选项目，按行业通用 AI 训练师场景列即可）';

  return `为「${category}」行业列出 10-12 个 AI 训练师 / 评测岗的细分应用场景。

【学生做过的项目类型（硬约束）】
${projects}

【生成规则——违反任一条整份作废】

1. **场景必须是"行业 ∩ 学生项目"的交集**
   每个场景必须**对应至少一个**学生勾选的项目类型，让学生能直接说"我用 X 项目方法做了这个 Y 行业的事"。
   反例：学生选了"T2I 文生图"+"图像描述"+"VQA"，行业是"电商"——
   ❌ 错误生成：「AI 商品文案生成」（这是纯文本生成，跟学生项目无关）
   ❌ 错误生成：「智能客服 Bad Case 分析」（学生没选客服项目）
   ✅ 正确生成：「电商商品图 T2I 模型评测」（对应学生 T2I 项目）
   ✅ 正确生成：「商品主图描述自动生成（Image Caption）」（对应学生 Image Caption 项目）
   ✅ 正确生成：「商品图视觉问答 VQA 评测」（对应学生 VQA 项目）

2. **禁止纯业务向场景**——「AI 风控系统」「智能推荐」「客服机器人」这种宽泛业务名，要么对应学生项目要么不出
   只列**学生能直接拿课程项目做出来**的训练师场景

3. **每个场景的 name 必须暗含项目类型**：
   - T2I 项目 → "X 行业 T2I 文生图评测 / 模型横评"
   - VLM/VQA → "X 行业视觉问答评测"
   - SFT 多轮 → "X 行业多轮对话 SFT 数据生产"
   - Agent ReAct → "X 行业 Agent 工作流评测"
   - 多模型横评 → "X 行业 N 款主流模型横评"

4. **description 一句话，≤ 25 字**，写做什么标注/评测，不要写业务价值

5. **输出严格 JSON 数组**，不要任何说明、不要 markdown 代码块：
   [{"name":"...","description":"..."}, ...]

直接输出 JSON 数组。`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const category = String(body.category ?? '').trim();
    const courseProjects = Array.isArray(body.courseProjects)
      ? (body.courseProjects as string[])
      : [];
    if (!category) {
      return NextResponse.json({ error: '缺少 category' }, { status: 400 });
    }

    const prompt = buildPrompt(category, courseProjects);

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

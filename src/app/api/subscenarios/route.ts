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

1. **场景必须对应学生勾选的项目类型**，让学生能直接说"我用 X 项目方法做了这个 Y 行业的事"
   ❌ 反例：学生选了 T2I+Caption+VQA + 电商，生成「AI 商品文案生成」（纯文本生成跟视觉项目无关）
   ❌ 反例：学生没选客服项目，生成「智能客服 Bad Case 分析」

2. **项目类型必须独立分组**——一个场景**只能对应一个**项目类型，**禁止跨项目合并**
   ❌ 反例：「商品图全链路评测（T2I+Caption+VQA）」（三合一违反硬约束）
   ✅ 同一业务对象（如"商品主图"）可以在 T2I 组和 Caption 组各出一个，但**不混在同一个场景**

3. **每组内部合并相关业务用例**（这是 V3.2-fix2 关键）——把同一项目类型下的多个相似业务用例归到一个场景，**不要拆 4 份**
   ❌ 拆细：「电商商品图 T2I」+「电商海报 T2I」+「直播背景 T2I」+「品牌 logo T2I」（4 个 T2I 场景，主图和海报应该在一起）
   ✅ 合并：「电商商品图 T2I 评测」description="主图 / 活动海报 / 详情图 / 直播背景等多场景 T2I 模型横评"（1 个 T2I 场景包含 4 个业务用例）

4. **场景数量分配**（按学生勾的项目数）
   - 学生勾 N 个项目 → 每个项目类型 1-2 个宽场景，最后再加 1 个综合横评
   - 总数控制在 10-12 个；少而精比多而碎好

5. **每个场景的 name 必须暗含项目类型**——项目类型有严格的方法论边界，**不要扩展**：
   - **T2I 文生图** = 图片生成（文→图）→ "X 行业 T2I 模型评测"
   - **Image Caption 图像描述** = **对已有图片生成描述（图→文）**，**不是**商品文案/营销文案/SEO 文案这种纯文本生成 → "X 行业图片描述自动生成评测"
   - **VQA 视觉问答** = 基于图片回答问题（图+问→答）→ "X 行业视觉问答评测"
   - **VLM** = 视觉-语言对齐评测 → "X 行业 VLM 评测"
   - **SFT 多轮** = 多轮对话标注 → "X 行业多轮对话 SFT 数据生产"
   - **Agent ReAct** = Tool 调用轨迹 → "X 行业 Agent 工作流评测"

5a. **特别警告：Image Caption 项目的边界**
   ❌ 学生勾了 Image Caption，**禁止**生成「商品标题生成」「营销文案生成」「短视频文案生成」「商品描述生成」这种**纯文本生成**场景——这些是 SFT/文生文项目，跟 Image Caption（图→文）无关
   ✅ Image Caption 场景必须以"图片"为输入：商品主图描述自动生成、详情图 alt 文本生成、用户晒单图描述、视频关键帧描述

6. **description ≤ 40 字**，用顿号列举该场景包含的具体业务用例
   ✅ 例："主图 / 活动海报 / 详情图 / 品牌 logo 等多场景 T2I 模型横评"
   ❌ 例："评测 T2I 模型生成商品图的能力"（太单薄，没列业务用例）

7. **输出严格 JSON 数组**，不要任何说明、不要 markdown 代码块：
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
    // V3.2-fix2：prompt 变长（含项目类型边界规则），实测 70-90s，留 240s 余量
    // V3.2-fix3：把客户端断连 signal 传到 spawn，避免切大类时旧 Claude 进程累积争抢资源
    const text = await callClaude(prompt, {
      model: 'claude-haiku-4-5-20251001',
      timeoutMs: 240_000,
      signal: req.signal,
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
    // V3.2-fix2：失败时只返回错误信息，不返回 fallback——
    // 之前 fallback 通用 6 项跟用户选的"电商"完全无关，反而误导
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : '生成失败',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

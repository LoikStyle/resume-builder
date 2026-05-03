import { NextRequest, NextResponse } from 'next/server';
import { callClaude, extractJson } from '@/lib/claude-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Subscenario = {
  name: string;
  description: string;
  core_dimensions: string[]; // 4 个具体评测维度，用于学生简历的"评测维度数"量化
};

/**
 * V3.2 prompt：基于"行业 ∩ 学生项目"交集生成场景，禁止纯业务向
 */
function buildPrompt(category: string, courseProjects: string[]): string {
  const projects = courseProjects.length
    ? courseProjects.map((p) => `- ${p}`).join('\n')
    : '（学生还没选项目，按行业通用 AI 训练师场景列即可）';

  return `为「${category}」行业列出 8-10 个 AI 训练师 / 评测岗的细分评测场景。

【学生做过的项目类型（硬约束）】
${projects}

【输出格式——3 字段】
每个场景输出 3 字段：
- name：场景全称（含行业 + 评测专项 + 项目类型简写 + "评测"），15-20 字
- description：30-50 字，专业术语描述评测对象 + 评测内容
- core_dimensions：**4 个具体评测维度**（不是描述！是 4 个维度名词，用 / 分隔的字符串数组）

【优秀范本 — 必须严格学习这种风格（用户给的 6 个）】
\`\`\`json
[
  {
    "name": "短漫剧单集 T2V 生成质量评测",
    "description": "评测文生视频模型生成单集短漫剧的基础画质、时长合规性与完播度",
    "core_dimensions": ["画面清晰度", "时长合规", "基础画质", "无明显畸变"]
  },
  {
    "name": "短漫剧角色一致性 I2V 专项评测",
    "description": "评测图生视频模型在跨镜头场景下角色形象、服装、发型的一致性保持能力",
    "core_dimensions": ["面部一致性", "服装一致性", "发型一致性", "体型一致性"]
  },
  {
    "name": "短漫剧分镜叙事连贯性评测",
    "description": "评测模型生成多镜头短漫剧时的剧情连贯性与分镜切换合理性",
    "core_dimensions": ["镜头衔接", "剧情闭环", "时序逻辑", "切镜自然度"]
  },
  {
    "name": "短漫剧画面美学质量评测",
    "description": "从构图、光影、色彩、调度四大维度评测生成短漫剧的视觉美学表现",
    "core_dimensions": ["构图美学", "光影层次", "色彩调性", "镜头调度"]
  },
  {
    "name": "短漫剧动作流畅度与物理合理性评测",
    "description": "评测短漫剧中人物动作、物体运动的流畅度与物理规律还原能力",
    "core_dimensions": ["动作流畅度", "重力表现", "惯性合理性", "动作幅度"]
  },
  {
    "name": "短漫剧文本指令遵循度评测",
    "description": "评测模型对短漫剧 Prompt 中剧情、场景、人物设定的指令还原准确度",
    "core_dimensions": ["剧情遵循", "场景还原", "人设准确", "细节落实"]
  }
]
\`\`\`

学习要点：
- name 含「评测专项」（生成质量 / 一致性 / 连贯性 / 美学 / 物理 / 指令遵循）
- description 用专业术语（完播度 / 时长合规 / 跨镜头 / 闭环 / 还原度）
- core_dimensions 是**具体的 4 个评测维度名词**（不是描述句）

【硬约束】

1. **场景必须对应学生勾选的项目类型**，禁止生成学生没勾的方法论
   ❌ 学生选 T2I+Caption+VQA → 生成「商品文案生成」（这是 SFT 不是图→文 Caption）
   ❌ 学生没选客服 → 生成「智能客服 Bad Case 分析」

2. **项目类型独立**——一个场景对应一个项目类型，禁止跨项目合并（"全链路 T2I+Caption+VQA"违规）

3. **每个项目类型生成 1-2 个评测专项场景**：
   - 同一项目下的多个评测专项不要混（生成质量 / 一致性 / 连贯性 各自一个场景）
   - 学生勾 N 个项目 → 总场景数 1-2N + 1 个综合横评

4. **项目方法论边界（参考之前修复，仍有效）**：
   - T2I = 文→图（不是商品文案）
   - Image Caption = 图→文（不是营销文案）
   - VQA = 图+问→答
   - VLM = 视觉-语言对齐
   - T2V = 文→视频；I2V = 图→视频
   - SFT 多轮 = 多轮对话；Agent ReAct = Tool 调用轨迹

5. **输出严格 JSON 数组**，每个对象**必须有 name + description + core_dimensions 3 字段**，不要任何说明、不要 markdown 代码块。

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

import type { IntakeAnswers } from '@/lib/schema/resume';

/** Step 1 输出：业务背景 */
export type SceneContext = {
  clientWho: string;      // 甲方是谁，为什么需要这类数据
  tasks: string[];        // 具体任务列表（动词+对象）
  challenges: string[];   // 场景特殊挑战
};

/** Step 2 输出：规则维度 */
export type DimensionItem = {
  name: string;       // 维度名称（行业通用术语）
  criterion: string;  // 验收标准（一句话）
};

export type DimensionContext = {
  dimensions: DimensionItem[];
};

/** 合并给 Step 3 用的 chain 上下文 */
export type ChainContext = {
  businessContext: SceneContext;
  dimensions: DimensionItem[];
};

// ─── Step 1 Prompt：场景业务展开 ───────────────────────────────────────────

export function buildSceneExpandPrompt(answers: IntakeAnswers): string {
  const industry = answers.industryCategory || '（未指定）';
  const projects = answers.courseProjects.join('、') || '（未指定）';
  const subScenes = (answers.subScenarios ?? []).join('、') || '（未指定）';

  return `你是 AI 训练师 / 评测岗的行业专家。一位求职学生要做这个方向的简历，请从行业内部人的视角整理业务背景。

行业：${industry}
细分场景：${subScenes}
学生做过的项目类型：${projects}

请回答以下三个问题：
1. 甲方（需求方）是谁？他们为什么需要这类 AI 训练/评测数据？（1-2 句，说清业务逻辑）
2. AI 训练师/评测师在这个场景下具体会做哪些任务？（3-5 个，每个用"动词+对象"格式，15 字内）
3. 这类数据项目的特殊挑战是什么？（1-2 点，15 字内，说具体不说废话）

直接输出 JSON，不要任何说明文字：
{"clientWho":"string","tasks":["string"],"challenges":["string"]}`;
}

// ─── Step 2 Prompt：规则维度推导 ───────────────────────────────────────────

export function buildDimensionPrompt(
  answers: IntakeAnswers,
  sceneCtx: SceneContext
): string {
  const industry = answers.industryCategory || '（未指定）';
  const subScenes = (answers.subScenarios ?? []).join('、') || '（未指定）';
  const projects = answers.courseProjects.join('、');

  return `已知 AI 训练/评测场景：
- 行业：${industry}，细分：${subScenes}
- 甲方：${sceneCtx.clientWho}
- 具体任务：${sceneCtx.tasks.join('、')}
- 场景挑战：${sceneCtx.challenges.join('；')}

学生做过的项目类型：${projects}

请列出这个场景下，标注和评测工作的核心规则维度（4-8 个）。
要求：
- 名称用行业通用术语（如"图文相关性"、"语义一致性"、"边界框精度"、"GSB 盲测"、"Kappa 系数"）
- 验收标准一句话说清"怎么算达标"（20 字内，禁止写废话如"保证质量"）
- 必须和上面的具体任务强相关，不要写泛泛的通用标准

直接输出 JSON，不要任何说明文字：
{"dimensions":[{"name":"string","criterion":"string"}]}`;
}

// ─── 格式化 chain 上下文，注入 Step 3 prompt ───────────────────────────────

export function formatChainContext(ctx: ChainContext): string {
  const { businessContext: bc, dimensions } = ctx;
  const taskList = bc.tasks.map((t) => `  · ${t}`).join('\n');
  const dimList = dimensions.map((d) => `  · ${d.name}：${d.criterion}`).join('\n');

  return `【AI 推导第一步：业务背景】
甲方：${bc.clientWho}
具体任务：
${taskList}
场景挑战：${bc.challenges.join('；')}

【AI 推导第二步：规则维度】（用于指导简历的动词选取和成果描述）
${dimList}`;
}

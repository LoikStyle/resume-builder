/**
 * 扣子（Coze）国内版工作流 HTTP 调用
 * V2 改动：检索结果改为 ruleFragments + jdBlocks + structureSample
 */

const COZE_BASE = process.env.COZE_BASE_URL ?? 'https://api.coze.cn';

export type RuleFragment = {
  id: string;
  rule_dimension: string;
  task_type: string;
  fragment: string;
  source: string;
  style: string;
};

export type JDBlock = {
  id: string;
  company: string;
  role_title: string;
  block: string;
  is_trainer: boolean;
};

export type StructureSample = {
  id: string;
  layout: string;
  title_style: string;
  highlight_style: string;
  section_order: string[];
  visual_signature: string;
  good_for: string;
};

export type RetrievalResult = {
  intent: {
    roleDirection?: string;
    subDirections?: string[];
    targetRole?: string;
    mustHaveSkills?: string[];
  };
  ruleFragments: RuleFragment[];     // RAG 1：简历规则维度片段
  jdBlocks: JDBlock[];                // RAG 2：JD 大段
  structureSample: StructureSample;   // RAG 3：随机一套结构样本
};

export async function runRetrievalWorkflow(input: {
  scenario: string;
  intakeAnswers: Record<string, unknown>;
}): Promise<RetrievalResult> {
  const pat = process.env.COZE_PAT;
  const workflowId = process.env.COZE_WORKFLOW_ID;

  if (!pat || !workflowId) {
    console.warn('[coze-client] 未配置 COZE_PAT/COZE_WORKFLOW_ID，使用 mock 检索');
    return mockRetrieval(input);
  }

  const resp = await fetch(`${COZE_BASE}/v1/workflow/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      parameters: {
        student_input: input.scenario,
        intake_answers: JSON.stringify(input.intakeAnswers),
      },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Coze workflow ${resp.status}: ${txt}`);
  }
  const wrap = (await resp.json()) as { data?: string; code?: number; msg?: string };
  if (wrap.code && wrap.code !== 0) {
    throw new Error(`Coze workflow code=${wrap.code}: ${wrap.msg}`);
  }
  if (!wrap.data) throw new Error('Coze workflow 无 data 字段');
  return JSON.parse(wrap.data) as RetrievalResult;
}

/** POC mock：从本地 JSON 文件读取并随机采样 */
async function mockRetrieval(input: {
  scenario: string;
  intakeAnswers: Record<string, unknown>;
}): Promise<RetrievalResult> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const rulesPath = path.join(process.cwd(), 'data', 'resume_rules.json');
  const jdsPath = path.join(process.cwd(), 'data', 'jd_blocks.json');
  const structPath = path.join(process.cwd(), 'data', 'structure_samples.json');

  const rules = JSON.parse(await fs.readFile(rulesPath, 'utf-8')) as RuleFragment[];
  const jds = JSON.parse(await fs.readFile(jdsPath, 'utf-8')) as JDBlock[];
  const structures = JSON.parse(await fs.readFile(structPath, 'utf-8')) as StructureSample[];

  // RAG 3：每次随机选 1 套结构（关键随机性来源）
  const structureSample = structures[Math.floor(Math.random() * structures.length)];

  const answers = input.intakeAnswers as {
    industryCategory?: string;
    subScenarios?: string[];
    courseProjects?: string[];
  };

  return {
    intent: {
      subDirections: answers.subScenarios ?? [],
      targetRole: 'AI 训练师 / 评测',
      mustHaveSkills: answers.courseProjects ?? [],
    },
    // mock 阶段返回 top 6 条规则 + top 3 段 JD + 1 套结构
    ruleFragments: rules.slice(0, 6),
    jdBlocks: jds.slice(0, 3),
    structureSample,
  };
}

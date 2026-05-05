/** 扣子（Coze）国内版工作流 HTTP 调用 */

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

// ─── 简历内容生成工作流（独立于 RAG 检索）───────────────────────────────────

const RESUME_WORKFLOW_ID =
  process.env.COZE_RESUME_WORKFLOW_ID ?? '7636018882504146959'; // Resume_2（双RAG+豆包）

export type ResumeWorkflowOutput = {
  output: string; // Markdown 格式：# 个人优势 + # 项目经历
};

/**
 * 调扣子简历生成工作流
 * 输入：行业 / 课程项目 / 细分场景
 * 输出：个人优势（6条）+ 项目经历（4段，每段 5 个动作）的 Markdown 文本
 */
export async function runResumeWorkflow(params: {
  company_industry: string;
  project_type: string;
  project_scenario: string;
  work_years?: string;
}): Promise<string> {
  const pat = process.env.COZE_PAT;
  if (!pat) throw new Error('COZE_PAT 未配置');

  const resp = await fetch(`${COZE_BASE}/v1/workflow/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: RESUME_WORKFLOW_ID,
      parameters: params,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Coze resume workflow ${resp.status}: ${txt}`);
  }
  const wrap = (await resp.json()) as { data?: string; code?: number; msg?: string };
  if (wrap.code && wrap.code !== 0) {
    throw new Error(`Coze resume workflow code=${wrap.code}: ${wrap.msg}`);
  }
  if (!wrap.data) throw new Error('Coze resume workflow 无 data 字段');

  const parsed = JSON.parse(wrap.data) as ResumeWorkflowOutput;
  return parsed.output;
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
    // mock 阶段返回 top 3 条规则 + top 2 段 JD + 1 套结构（V2 性能优化：少传比传多更准）
    ruleFragments: rules.slice(0, 3),
    jdBlocks: jds.slice(0, 2),
    structureSample,
  };
}

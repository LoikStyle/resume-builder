/**
 * 扣子（Coze）国内版工作流 HTTP 调用
 * 文档：https://www.coze.cn/open/docs
 */

const COZE_BASE = process.env.COZE_BASE_URL ?? 'https://api.coze.cn';

export type RetrievalResult = {
  intent: {
    roleDirection?: string;
    subDirections?: string[];
    targetRole?: string;
    mustHaveSkills?: string[];
  };
  resume_cards: Array<Record<string, unknown>>;
  jd_segments: Array<Record<string, unknown>>;
};

export async function runRetrievalWorkflow(input: {
  scenario: string;
  intakeAnswers: Record<string, unknown>;
}): Promise<RetrievalResult> {
  const pat = process.env.COZE_PAT;
  const workflowId = process.env.COZE_WORKFLOW_ID;

  // POC fallback：扣子未配置时返回 mock 检索结果，让全流程能跑通
  if (!pat || !workflowId) {
    console.warn('[coze-client] 未配置 COZE_PAT/COZE_WORKFLOW_ID，使用 mock 检索结果');
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

/** POC 阶段没配扣子时的 mock 检索结果——直接读本地示例 JSON */
async function mockRetrieval(input: {
  scenario: string;
  intakeAnswers: Record<string, unknown>;
}): Promise<RetrievalResult> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const cardsPath = path.join(process.cwd(), 'data', 'resume_cards.json');
  const jdsPath = path.join(process.cwd(), 'data', 'jd_segments.json');

  const cards = JSON.parse(await fs.readFile(cardsPath, 'utf-8')) as Array<
    Record<string, unknown>
  >;
  const jds = JSON.parse(await fs.readFile(jdsPath, 'utf-8')) as Array<
    Record<string, unknown>
  >;

  return {
    intent: {
      roleDirection: (input.intakeAnswers.roleDirection as string) ?? 'mixed',
      subDirections: (input.intakeAnswers.sceneInterests as string[]) ?? [],
      targetRole: 'AI 训练师 / 评测',
      mustHaveSkills: [],
    },
    resume_cards: cards.slice(0, 8),
    jd_segments: jds.slice(0, 5),
  };
}

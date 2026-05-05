import type {
  RuleFragment,
  JDBlock,
  StructureSample,
} from '@/lib/coze-client';
import type { IntakeAnswers, WorkYears } from '@/lib/schema/resume';
import type { ChainContext } from '@/lib/prompts/chain-steps';
import { formatChainContext } from '@/lib/prompts/chain-steps';

export function buildGeneratePrompt(args: {
  scenario: string;
  intakeAnswers: IntakeAnswers;
  basicInfo?: Record<string, string>;
  ruleFragments: RuleFragment[];
  jdBlocks: JDBlock[];
  structureSample: StructureSample;
  dataRangeSection: string;
  chainContext?: ChainContext;   // Step1+2 推导结果（可选，缺失时降级为原流程）
}): string {
  const schemaJson = SCHEMA_DESCRIPTION;
  const basic = args.basicInfo ?? {};
  const yearsHint = WORK_YEARS_HINT[args.intakeAnswers.workYears ?? '0'];

  return `你是 AI 训练师 / 评测岗简历定制专家。生成 Resume JSON。

【基本信息】（resume.basic 必须用真实值，不要写 [待补充]）
姓名 ${basic.name || '[待补充]'} | 手机 ${basic.phone || '[待补充]'} | 邮箱 ${basic.email || '[待补充]'}
毕业院校 ${basic.school || '[待补充]'} | 专业 ${basic.major || '[待补充]'} | 毕业 ${basic.graduation || '[待补充]'}

【工作年限】${args.intakeAnswers.workYears}（${yearsHint.label}）
${yearsHint.guidance}
${yearsHint.fixedItem}

【方向】
- 行业大类: ${args.intakeAnswers.industryCategory}
- 细分场景: ${(args.intakeAnswers.subScenarios ?? []).join('、') || '（无）'}
- 做过的项目: ${args.intakeAnswers.courseProjects.join('、')}
- 模型/工具: 根据项目类型推断常用工具（RAG → Dify/向量库；Agent → ReAct 框架；多模态 → Sora/可灵 等）
${args.intakeAnswers.pathwayScene ? `- 路演场景: ${args.intakeAnswers.pathwayScene}` : ''}
${args.scenario ? `- 学生原话: ${args.scenario}` : ''}

${args.dataRangeSection}

${args.chainContext ? formatChainContext(args.chainContext) + '\n' : ''}
【规则维度参考】（学方法论，禁止抄原文）
${args.ruleFragments.map((r, i) => `${i + 1}. [${r.rule_dimension}] ${r.fragment}`).join('\n')}

【JD 参考】（用业内话术）
${args.jdBlocks.map((j, i) => `${i + 1}. ${j.company} ${j.role_title}：${j.block}`).join('\n\n')}

【视觉结构】${args.structureSample.layout} / ${args.structureSample.visual_signature}（${args.structureSample.highlight_style}），板块顺序 ${args.structureSample.section_order.join('→')}

【输出要求】

Schema：
${schemaJson}

硬约束：
1. **数据量必须写具体数字**——按【数据量范围约束】取整数值写入 results；每个项目取不同随机值；禁止写"数千条"、"万级别"等模糊词；**不写项目周期**（experiences 不输出 period 字段；education 写时间）
2. 量化用训练师维度：维度数 / 模型对比数 / 场景覆盖数 / Bad Case 类别数 / 拦截率。**禁止算法指标**（FID / 推理速度 / 训练 epoch）
3. experiences 4-6 项；type 区分 internship/training_project/campus/competition；学生勾选的课程项目少于 4 个时从课程范围（RAG/CoT/Agent/多模态/横评/Dify SFT）补齐
4. 每个 experience 必须三段 background（≤80字）/ actions（≥2条 30-60字）/ results（≥1条带量化）
5. action 动词：搭建/制定/迭代/设计/输出/验收/统筹/归纳。**禁用**：参与了 / 协助 / 负责了
6. resume.basic 用真实信息，缺的省略；resume.education 用"毕业前 4 年.09 - 毕业时间"推算（如 2025.06 → "2021.09 - 2025.06"），degree 默认"本科"
7. selfEvaluation 2-4 句体现行业大类+细分场景+工作年限段位
8. skills 从模型/工具直接映射，按 category 分组（仅"模型"/"评测框架"/"自动化工具"/"通用"，不输出"标注方法"分类）
9. 总字数 1200 字内（不含 basic/education/skills/自评）

【防幻觉硬约束 — 违反一条整份作废】

A. **禁止编造任何具体数字**——以下值学生没明确给就**不能写**：
   - 一致性系数 / Kappa 值 / IAA 等具体数（如"0.85"、"0.87"）→ 改用"多人盲标对齐"
   - 上手时间（如"30 分钟新人独立上手"）→ 改用"通过新人验收"
   - 具体类目数（如"覆盖种草/攻略/测评 3 类"）→ 学生没说就写"覆盖核心垂直场景"
   - 具体 Bad Case 数（如"5 类 Bad Case"）→ 改用"多类高频 Bad Case"
   - 具体准确率/通过率（如"92% 拦截率"）→ 改用"显著提升拦截率"
   - 量化值**只能直接来自学生 highlights 或基本信息**，其他数字一律模糊化

B. **禁止使用学生未勾选的方法论术语**：
   - experiences 必须**只能从学生勾选的 courseProjects 里挑或扩展**到课程范围（RAG / CoT / SFT / RLHF / Agent ReAct / 多模态 T2I/T2V/VLM / 多模型横评 / Dify SFT 合成 / 路演）
   - 学生没选"RAG"就**不能**写 RAG 项目；没选"Agent"就**不能**写 ReAct 项目
   - 课程外的术语（如"Q+R+R"、"DPO"、"PPO"）**禁止出现**

C. **规则维度参考是"借势"不是"抄袭"**：
   - 上面【规则维度参考】里的方法论描述是**学生没做过的别人项目**
   - 你只能借用其"做事维度"和"动词风格"——比如"对 Bad Case 分类归因"这个做法可以借
   - **禁止**把规则参考里的具体场景搬到学生项目（如规则参考里"小红书内容评测"，学生没做过就不能写）

D. **selfEvaluation 不写学生身份外的能力**：
   - 工具熟悉度根据学生勾选的项目类型合理推断（RAG 项目 → Dify 等）
   - 学生工作年限决定能力描述的边界（应届不写"主导团队"、"建立 SOP"）

E. **不能确定的数字 / 描述用兜底表达**：
   - 不写："一致性达 0.85" → 写："多人盲标对齐评分"
   - 不写："覆盖 6 类垂直场景" → 写："覆盖核心垂直场景"或学生 sceneInterests 里实际选的
   - 不写："3 类 Bad Case 频次分布" → 写："多类高频 Bad Case 归因"
   - 不写："30 分钟独立上手" → 写："通过新人验收测试"

直接输出 JSON 对象，不要说明、不要 markdown。`;
}

/** 工作年限对应的 hint */
const WORK_YEARS_HINT: Record<
  WorkYears,
  { label: string; guidance: string; fixedItem: string }
> = {
  '0': {
    label: '应届，无实习',
    guidance:
      '应届段位**纯执行**：动词只用"搭建 / 标注 / 评估 / 归纳 / 撰写"。**禁止任何管理动作**（不要写带人 / 带团队 / 管实习生 / 制定 SOP）。',
    fixedItem: '- 应届简历不写任何管理项；experiences 都用执行视角。',
  },
  '<1': {
    label: '1 年内（有实习）',
    guidance:
      '初阶段位偏执行 + 局部参与：动词以"搭建 / 设计 / 制定 / 标注 / 归纳"为主；可写"协助制定规则 / 主导某个评测维度"。**不写带人 / 管实习生**——这阶段学生自己还是被管的角色。',
    fixedItem: '- 不要加任何带人 / 管实习生 / 团队管理项。',
  },
  '1-3': {
    label: '1-3 年',
    guidance:
      '中阶段位：偏规则设计 + 跨职能协同。动词加"制定 / 主导 / 复盘 / 跨团队协同"；可适度写"协调标注小组 / 带 1-2 个新人"。',
    fixedItem: '- 可加 1 项体现协调 / 协同的经历。',
  },
  '>3': {
    label: '3 年以上',
    guidance:
      '高阶段位：**管理者视角**。动词以"统筹 / 制定 / 复盘 / 规则维护 / 团队建设"为主；明确写"管理标注团队 / 带实习生 / 制定 SOP / 跨部门协同"。',
    fixedItem: '- 必加固定项：在 experiences 中体现"管理团队 / 带实习生 / 制定全员 SOP"等管理动作。',
  },
};

const SCHEMA_DESCRIPTION = `{
  "basic": {
    "name": "string",
    "objective": "string (求职意向)",
    "phone": "string",
    "email": "string",
    "birth": "string optional",
    "hometown": "string optional",
    "politicalStatus": "string optional",
    "photo": "string optional"
  },
  "selfEvaluation": "string (max 300, 2-4 句)",
  "education": [{
    "period": "string",
    "school": "string",
    "major": "string",
    "degree": "本科 | 硕士 | 博士 (optional)",
    "gpa": "string optional",
    "courses": "string optional"
  }],
  "experiences": [{   // 必须 4-6 项
    "id": "string (uuid 即可)",
    "type": "internship | training_project | campus | competition",
    "period": "string optional",
    "org": "string",
    "role": "string",
    "background": "string (≤80 字)",
    "actions": ["string", ...],   // ≥2 条
    "results": ["string", ...],   // ≥1 条带量化
    "taskType": ["..."] optional,
    "dataModality": ["..."] optional,
    "modelsUsed": ["string"] optional,
    "toolsUsed": ["string"] optional
  }],
  "skills": [{
    "name": "string",
    "level": "了解 | 熟练 | 精通 (optional)",
    "category": "模型 | 评测框架 | 标注方法 | 自动化工具 | 通用 (optional)"
  }],
  "honors": ["string", ...] optional
}`;

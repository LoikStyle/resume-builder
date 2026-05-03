import type {
  RuleFragment,
  JDBlock,
  StructureSample,
} from '@/lib/coze-client';
import type { IntakeAnswers, WorkYears } from '@/lib/schema/resume';

export function buildGeneratePrompt(args: {
  scenario: string;
  intakeAnswers: IntakeAnswers;
  basicInfo?: Record<string, string>;
  ruleFragments: RuleFragment[];
  jdBlocks: JDBlock[];
  structureSample: StructureSample;
}): string {
  const schemaJson = SCHEMA_DESCRIPTION;
  const basic = args.basicInfo ?? {};
  const yearsHint = WORK_YEARS_HINT[args.intakeAnswers.workYears];

  return `你是 AI 训练师 / 评测岗位简历定制专家。基于学生真实经历和课程作业，参考行业规则维度与目标岗位 JD，按选定的视觉结构生成简历 JSON。

【学生基本信息】（resume.basic 字段必须用真实信息，不要写 "[待补充]"）
- 姓名: ${basic.name || '[待补充]'}
- 手机: ${basic.phone || '[待补充]'}
- 邮箱: ${basic.email || '[待补充]'}
- 毕业院校: ${basic.school || '[待补充]'}
- 专业: ${basic.major || '[待补充]'}
- 毕业时间: ${basic.graduation || '[待补充]'}

【学生工作年限】${args.intakeAnswers.workYears}（${yearsHint.label}）
${yearsHint.guidance}

【学生选择的方向】
- 行业大类: ${args.intakeAnswers.industryCategory}
- 细分场景: ${args.intakeAnswers.subScenarios.join('、') || '（学生未明确）'}
- 做过的项目: ${args.intakeAnswers.courseProjects.join('、')}
- 用过的模型/工具: ${args.intakeAnswers.modelsTools.join('、')}
${args.intakeAnswers.pathwayScene ? `- 路演具体场景: ${args.intakeAnswers.pathwayScene}` : ''}

【学生原始描述】
${args.scenario || '（无）'}

【规则维度参考】（这是"别人怎么做事"的方法论片段；学这种做事方式，**禁止抄写片段原文**，要在学生自己项目语境里复用规则维度）
${args.ruleFragments
  .map(
    (r, i) =>
      `${i + 1}. [${r.rule_dimension}｜${r.task_type}｜${r.style}]\n   ${r.fragment}\n   （来源：${r.source}）`
  )
  .join('\n\n')}

【目标岗位 JD 参考】（用业内说法和动词；不要抄整段 JD）
${args.jdBlocks
  .map(
    (j, i) =>
      `${i + 1}. ${j.company} - ${j.role_title}\n   ${j.block}`
  )
  .join('\n\n')}

【视觉结构参考】（这次随机选了一套，影响 section_order 和强调风格）
- 布局: ${args.structureSample.layout}
- 标题风格: ${args.structureSample.title_style}
- 重点高亮: ${args.structureSample.highlight_style}
- 板块顺序建议: ${args.structureSample.section_order.join(' → ')}
- 整体调性: ${args.structureSample.visual_signature}

【硬性输出要求】

1. 严格输出 JSON，符合 Resume schema：
${schemaJson}

2. AI 训练师岗专属约束：
- 不写数据量绝对值：禁止"标注 10 万条"、"覆盖 100 万张图"——学生不知道真实数。改用"数千条"、"万级别"、"全量验收"等模糊量化
- 不写项目周期：experiences[].period 留空（不输出该字段）；只 education[] 写时间
- 量化指标用训练师维度：维度数（"5 维度评测体系"）/ 模型对比数 / 场景覆盖数 / Bad Case 类别数 / 评测报告数 / 拦截率
- 禁止写算法岗指标：FID / 推理速度 / 训练 epoch / 模型参数量等

3. 基于学生真实经历（不编造）：
- experiences 必须 4-6 项
- 实习用 type='internship'；课程作业 type='training_project'；校园经历 type='campus'；竞赛 type='competition'
- 量化数字根据规则维度参考与 JD 的合理推断生成（比如"5 维度评测体系"、"横评 6 款模型"），**但不能写学生没做过的项目类型**
- 如果学生勾选的课程项目少于 4 个，从课程范围内（RAG 评估 / CoT 推理标注 / Agent ReAct / 多模态评测 / 多模型横评 / Dify SFT 合成）选剩余的凑够 4-6 个
${yearsHint.fixedItem}

3a. resume.basic 字段：必须用上面【学生基本信息】里的真实值（姓名/手机/邮箱）。学生没填的（如 photo）省略不输出。

3b. resume.education 字段：基于"毕业院校 / 专业 / 毕业时间"组装一条。period 用"<毕业前 4 年>.09 - <毕业时间>"推算（如毕业 2025.06 → "2021.09 - 2025.06"），degree 默认填"本科"。GPA、courses 学生没给就省略不输出。

4. 超集字段必填（前端按密度模板挑）：
- 每个 experience 都填三段：background（80 字内）/ actions（≥2 条，30-60 字/条）/ results（≥1 条带量化）
- actions 动词从规则维度片段里提到的项目动词选（搭建 / 制定 / 迭代 / 设计 / 输出 / 验收 / 统筹 / 归纳）
- 禁用词：参与了 / 协助 / 负责了 / 做了一些（应届生空话）

5. 两页 A4 字数控制：experiences 总字数 1200 字内（不含基本信息+教育+技能+自评）

6. selfEvaluation：2-4 句，体现"行业大类 + 细分场景"和工作年限段位的能力描述，用 JD 话术

7. skills：从学生选的"模型 / 工具"映射；按 category 分组（模型 / 评测框架 / 标注方法 / 自动化工具）

直接输出 JSON 对象，不要任何说明文字、不要 markdown 代码块。`;
}

/** 工作年限对应的 hint */
const WORK_YEARS_HINT: Record<
  WorkYears,
  { label: string; guidance: string; fixedItem: string }
> = {
  '0': {
    label: '应届，无实习',
    guidance:
      '应届段位偏执行：用"搭建 / 标注 / 评估 / 归纳"等动词；管理经验体现在"管实习生 / 协调小组路演"这种小范围。',
    fixedItem:
      '- 必加固定项：在 experiences 中加一条 type="campus" 或 type="training_project"，体现"管理课程小组实习生 / 路演分工 / 标注质检负责"，role 写"小组负责人"或"质检主导"。',
  },
  '<1': {
    label: '1 年内（有实习）',
    guidance:
      '初阶段位偏执行 + 局部规则设计：动词以"搭建 / 设计 / 制定 / 标注 / 归纳"为主；可写"协助制定规则 / 主导某个评测维度"。',
    fixedItem:
      '- 推荐加固定项：在 experiences 中体现"管理实习生 / 协调标注小组"的角色（不超过 1 项）。',
  },
  '1-3': {
    label: '1-3 年',
    guidance:
      '中阶段位：偏规则设计 + 跨职能协同。动词加重"制定 / 主导 / 复盘 / 跨团队协同"；量化指标关注"规则版本数 / 覆盖场景数 / 标注一致性"。',
    fixedItem: '- 不强制固定项，但管理动词权重提升。',
  },
  '>3': {
    label: '3 年以上',
    guidance:
      '高阶段位：管理 + 战略。动词以"统筹 / 制定 / 复盘 / 规则维护 / 团队建设"为主；管理权重显著（管理团队 / 制定标准 / 跨部门协同）。',
    fixedItem: '- 必加固定项：在 experiences 中体现"管理标注团队 / 制定全员标注 SOP"等管理动词。',
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

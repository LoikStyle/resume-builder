export function buildGeneratePrompt(args: {
  scenario: string;
  intakeAnswers: Record<string, unknown>;
  basicInfo?: Record<string, string>;
  resumeCards: Array<Record<string, unknown>>;
  jdSegments: Array<Record<string, unknown>>;
}): string {
  // 精简手写 schema 描述（比 zodToJsonSchema 输出短 5-10 倍，Claude 处理更快）
  const schemaJson = SCHEMA_DESCRIPTION;
  const basic = args.basicInfo ?? {};

  return `你是 AI 训练师/评测岗位简历定制专家。基于学生真实经历和课程作业，参考行业范本，生成符合目标岗位的简历 JSON。

【学生基本信息】（resume.basic 字段必须使用这些真实信息，不要编造、不要写"[待补充]"）
- 姓名: ${basic.name || '[待补充]'}
- 手机: ${basic.phone || '[待补充]'}
- 邮箱: ${basic.email || '[待补充]'}
- 毕业院校: ${basic.school || '[待补充]'}
- 专业: ${basic.major || '[待补充]'}
- 毕业时间: ${basic.graduation || '[待补充]'}

【学生原始描述】
${args.scenario}

【学生段 0 追问回答】（这是真实经历的来源，必须基于这些信息生成）
${JSON.stringify(args.intakeAnswers, null, 2)}

【风格参考：相似简历项目卡片】
${JSON.stringify(args.resumeCards, null, 2)}
（学风格和表达，禁止抄写内容；这些是别人的项目）

【目标岗位话术指南】
${JSON.stringify(args.jdSegments, null, 2)}
（用业内说法和动词，避免空话）

【硬性输出要求】

1. 严格输出 JSON，符合 Resume schema：
${schemaJson}

2. AI 训练师岗专属约束：
- 不写数据量绝对值：禁止"标注 10 万条"、"覆盖 100 万张图"——学生不知道真实数。改用"数千条"、"万级别"、"全量验收"等模糊量化
- 不写项目周期：experiences[].period 留空（不输出该字段）；只 education[] 写时间
- 量化指标用训练师维度：维度数（"5 维度评测体系"）/ 模型对比数 / 场景覆盖数 / Bad Case 类别数 / 评测报告数 / 拦截率
- 禁止写算法岗指标：FID / 推理速度 / 训练 epoch / 模型参数量等

3. 基于学生真实经历（不编造）：
- experiences 必须 4-6 项（用户硬要求）
- 实习用 type='internship'；课程作业 type='training_project'；校园经历 type='campus'；竞赛 type='competition'
- 量化数字只能来自 intake_answers.highlights；其他位置如学生未给数字，用 "[待补充]" 占位，不要编造
- 如果学生勾选的课程项目少于 4 个，从课程笔记里推荐能补的训练师项目（RAG 评估 / CoT 推理标注 / Agent ReAct / 多模态评测 / 多模型横评 / Dify SFT 合成）凑够 4-6 个

3a. resume.basic 字段：必须用上面【学生基本信息】里的真实值（姓名/手机/邮箱）。学生没填的（如 photo）省略不输出。

3b. resume.education 字段：基于【学生基本信息】里的"毕业院校/专业/毕业时间"组装一条。period 用"<毕业前 4 年>.09 - <毕业时间>"推算（如毕业 2025.06 → "2021.09 - 2025.06"），degree 填"本科"。GPA、courses 学生没给就省略不输出，不要写 "[待补充]"。

4. 超集字段必填（前端按密度模板挑）：
- 每个 experience 都填三段：background（80 字内）/ actions（≥2 条，30-60 字/条）/ results（≥1 条带量化）
- actions 动词必须从 jd_segments 提到的项目动词里选（"搭建/迭代/设计/输出/验收/制定/统筹"）
- 禁用词：参与了 / 协助 / 负责了 / 做了一些（应届生空话）

5. 两页 A4 字数控制：experiences 总字数 1200 字内（不含基本信息+教育+技能+自评）

6. selfEvaluation：2-4 句，体现 roleDirection 和 sceneInterests，用 jd_segments 的话术

7. skills：从 intake_answers.modelsTools 直接映射；按 category 分组（模型 / 评测框架 / 标注方法 / 自动化工具）

8. basic.objective 写"求职意向：AI 训练师 / 评测方向"或更具体的子方向

直接输出 JSON 对象，不要任何说明文字、不要 markdown 代码块。`;
}

const SCHEMA_DESCRIPTION = `{
  "basic": {
    "name": "string",
    "objective": "string (求职意向)",
    "phone": "string",
    "email": "string (邮箱格式)",
    "birth": "string optional (如 2002.03)",
    "hometown": "string optional",
    "politicalStatus": "string optional",
    "photo": "string optional"
  },
  "selfEvaluation": "string (max 300 chars, 2-4 句)",
  "education": [{
    "period": "string (如 2021.09 - 2025.06)",
    "school": "string",
    "major": "string",
    "degree": "本科 | 硕士 | 博士 (optional)",
    "gpa": "string optional",
    "courses": "string optional"
  }],
  "experiences": [{   // 必须 4-6 项
    "id": "string (uuid 即可)",
    "type": "internship | training_project | campus | competition",
    "period": "string optional (训练师项目可不写)",
    "org": "string (公司/项目名)",
    "role": "string (角色)",
    "background": "string (≤80字)",
    "actions": ["string", ...],   // ≥2 条
    "results": ["string", ...],   // ≥1 条带量化
    "taskType": ["标注|评测|数据生产|规则设计|质检|Prompt工程|多模型对比", ...] optional,
    "dataModality": ["对话/SFT|CoT|RLHF|RAG|Agent|多模态-图|多模态-视频|多模态-音", ...] optional,
    "modelsUsed": ["string", ...] optional,
    "toolsUsed": ["string", ...] optional
  }],
  "skills": [{
    "name": "string",
    "level": "了解 | 熟练 | 精通 (optional)",
    "category": "模型 | 评测框架 | 标注方法 | 自动化工具 | 通用 (optional)"
  }],
  "honors": ["string", ...] optional
}`;

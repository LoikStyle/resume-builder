import type { Resume } from '@/lib/schema/resume';

/** 编辑器首次进入用的样板简历，让学生立刻看到一份能用的范例 */
export const mockResume: Resume = {
  basic: {
    name: '张三',
    objective: '求职意向：AI 训练师 / 评测方向',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    birth: '2002.03',
    hometown: '广东省深圳市',
    politicalStatus: '中共党员',
  },
  selfEvaluation:
    '系统学习大模型评测与数据生产全流程，熟悉 SFT / RLHF / RAG / Agent / 多模态等多类数据标注与评估；具备完整的评测集搭建、多维度评分体系设计、多模型横评与 Bad Case 归因能力；中文表达扎实，能产出置信度高的评测报告。对内容创作与多模态方向特别感兴趣。',
  education: [
    {
      period: '2021.09 - 2025.06',
      school: '某大学',
      major: '计算机科学与技术',
      degree: '本科',
      gpa: '3.7 / 4.0',
      courses: '机器学习、自然语言处理、人工智能导论、概率论与数理统计、线性代数',
    },
  ],
  experiences: [
    {
      id: 'exp_001',
      type: 'training_project',
      org: 'AI 训练师课程项目',
      role: '主导规则设计',
      background:
        '面向小红书内容生成场景，搭建评测集与多维度评分体系，输出多模型横评报告。',
      actions: [
        '制定首句吸引力、卖点密度、情绪带入、合规性 4 维度评分规则',
        '搭建覆盖美妆 / 旅行 / 数码 / 穿搭 / 美食 / 游戏 6 类的评测集',
        '组织多人盲标，对齐评分一致性，归纳分歧用例',
      ],
      results: [
        '横评 3 款主流模型，覆盖 6 个垂直场景，输出 1 份评测报告',
        '发现 4 类高频 Bad Case，提出 3 项改进建议',
      ],
      taskType: ['评测', '规则设计'],
      dataModality: ['对话/SFT'],
      modelsUsed: ['豆包', '千问', '文心一言'],
      toolsUsed: ['SuperCLUE'],
    },
    {
      id: 'exp_002',
      type: 'training_project',
      org: 'AI 训练师课程项目',
      role: '独立完成',
      background:
        '围绕电商客服 RAG 场景，搭建 Q-R-R 三元评估流程，定位 RAG 链路质量瓶颈。',
      actions: [
        '设计问题合理性、材料相关性、回答质量 3 层审查标注规范',
        '执行 RAG 数据可用性判断，输出问题分类与拒答原因画像',
        '提出 Chunk 切分与 Rerank 优化建议',
      ],
      results: [
        '搭建 5 维度 RAG 评估体系，覆盖典型电商客服场景',
        '发现 3 类高频 Bad Case，整体可用率上升一档',
      ],
      taskType: ['评测', '标注'],
      dataModality: ['RAG'],
      modelsUsed: ['GPT-4', '豆包'],
      toolsUsed: ['Dify'],
    },
    {
      id: 'exp_003',
      type: 'training_project',
      org: 'AI 训练师课程项目',
      role: '负责质检',
      background:
        '针对 Agent ReAct 范式调用质量，搭建标注规范与轨迹质量评估流程。',
      actions: [
        '制定思考-行动-观察三环节标注规则与分级评分',
        '执行 Tool 调用序列标注，归纳重复调用、错误参数等高频问题',
        '推动多版本规则迭代，标注一致性显著提升',
      ],
      results: [
        '设计 4 维度 Agent 轨迹评估体系',
        '发现 5 类常见错误模式，沉淀为后续训练数据',
      ],
      taskType: ['标注', '评测'],
      dataModality: ['Agent'],
      modelsUsed: ['GPT-4', 'Claude'],
      toolsUsed: ['Dify'],
    },
    {
      id: 'exp_004',
      type: 'training_project',
      org: 'AI 训练师课程项目',
      role: '主导规则设计',
      background:
        '围绕文生视频质量评测，搭建多模型横评流程与多维度评分体系。',
      actions: [
        '构建文生视频评测集（覆盖人物 / 风景 / 动作 / 抽象 4 类提示词）',
        '制定画面真实度、运动连贯性、提示词一致性、安全性 4 维度评分规则',
        '组织多人盲标并撰写横评报告',
      ],
      results: [
        '横评 5 款主流文生视频模型',
        '撰写 1 份选型建议报告，覆盖 4 类典型场景',
      ],
      taskType: ['评测', '多模型对比'],
      dataModality: ['多模态-视频'],
      modelsUsed: ['Sora', '可灵', '海螺', '豆包'],
      toolsUsed: ['OpenCompass'],
    },
  ],
  skills: [
    { name: 'GPT-4', category: '模型', level: '熟练' },
    { name: 'Claude', category: '模型', level: '熟练' },
    { name: '豆包', category: '模型', level: '熟练' },
    { name: '千问', category: '模型', level: '熟练' },
    { name: 'OpenCompass', category: '评测框架', level: '熟练' },
    { name: 'SuperCLUE', category: '评测框架', level: '熟练' },
    { name: 'Dify', category: '自动化工具', level: '熟练' },
    { name: 'CoT', category: '标注方法', level: '熟练' },
    { name: 'RLHF', category: '标注方法', level: '熟练' },
    { name: 'Golden Set', category: '标注方法', level: '了解' },
    { name: 'AQL', category: '标注方法', level: '了解' },
  ],
  honors: ['英语六级证书', '全国计算机二级证书'],
};

/** 段 0 追问表单题目配置（按 AI 训练师/评测岗设计） */

export type Question =
  | { id: string; label: string; type: 'single'; options: { value: string; label: string }[] }
  | { id: string; label: string; type: 'multi'; options: string[]; customField?: string }
  | { id: string; label: string; type: 'multiGroups'; groups: Record<string, string[]> }
  | { id: string; label: string; type: 'multiFillable'; templates: string[] };

export const trainerQuestions: Question[] = [
  {
    id: 'roleDirection',
    label: '想投哪类训练师岗？',
    type: 'single',
    options: [
      { value: 'annotation', label: '偏标注 / 数据生产（SFT、RLHF、多模态）' },
      { value: 'eval', label: '偏评测 / Bad Case 分析（评测集、报告）' },
      { value: 'mixed', label: '综合（两者都做）' },
    ],
  },
  {
    id: 'sceneInterests',
    label: '感兴趣的场景（多选，决定项目方向）',
    type: 'multi',
    options: [
      '智能客服',
      '电商商品',
      '小红书等内容生成',
      '教育题目',
      '多模态(图/视频/音)',
      'Agent / Tool',
      'RAG 知识库',
      '法律 / 医疗（专业向）',
    ],
  },
  {
    id: 'courseProjects',
    label: '课程里完整做过的项目（勾选会进简历）',
    type: 'multi',
    options: [
      'RAG 知识库 Q-R-R 三元评估',
      'CoT 推理过程标注',
      'Agent ReAct 轨迹标注',
      '多模态文生图 / 视频评测',
      '多模型横评（5+ 款对比）',
      '用 Dify 合成 SFT 数据',
      '小组评测路演',
    ],
    customField: 'pathwayScene',
  },
  {
    id: 'modelsTools',
    label: '用过的模型 / 工具（多选，进技能区）',
    type: 'multiGroups',
    groups: {
      模型: [
        'GPT-4',
        'Claude',
        '豆包',
        'DeepSeek',
        '千问',
        '文心一言',
        'Gemini',
        'Sora',
        '可灵',
      ],
      评测框架: ['OpenCompass', 'SuperCLUE'],
      自动化工具: ['Dify', '火山引擎', 'Label Studio'],
      标注方法: [
        'ReAct',
        'CoT',
        'RLHF',
        'SFT',
        'DPO',
        'Golden Set',
        'AQL',
        'Q+R+R',
      ],
    },
  },
  {
    id: 'roleInProject',
    label: '在项目中通常的角色',
    type: 'single',
    options: [
      { value: '独立完成', label: '独立完成' },
      { value: '主导规则设计', label: '主导规则设计' },
      { value: '执行标注', label: '执行标注' },
      { value: '负责质检', label: '负责质检' },
      { value: '多角色轮换', label: '多角色轮换' },
    ],
  },
  {
    id: 'highlights',
    label: '量化亮点（至少填 1 项；不问数据量）',
    type: 'multiFillable',
    templates: [
      '设计 ___ 维度的评测体系',
      '横评 ___ 款模型',
      '覆盖 ___ 个垂直场景',
      '发现 ___ 类高频 Bad Case',
      '拦截率 / 通过率提升 ___%',
      '撰写 ___ 份评测报告',
    ],
  },
];

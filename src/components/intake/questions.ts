/**
 * 段 0 追问表单题目配置（V3）
 *
 * V3 改动：
 *   - 删 workYears（V2 单字段总年限）
 *   - 加 aiIndustryYears（4 档 AI 行业年限）
 *   - 加 resumeStructure（上下/左右/卡片）
 *   - 加 highlightFields（高亮定制）
 *   - 表单顺序调整：先项目，后年限（板书 3 条）
 *   - 删除"标注方法"组（之前已删，会议确认跟着项目走）
 *   - 不加"个人优势"（扣子工作流生成）
 */

import { INDUSTRIES } from '@/lib/industries';
import type { AIIndustryYears, ResumeStructure } from '@/lib/schema/resume';

export const AI_YEARS_OPTIONS: { value: AIIndustryYears; label: string; hint: string }[] = [
  { value: '<6m', label: '不到半年', hint: '应届 / 刚入行' },
  { value: '6m-1y', label: '半年-1 年', hint: '初级训练师' },
  { value: '1-2y', label: '1-2 年', hint: '中阶 / 偏执行+局部规则' },
  { value: '>2y', label: '2 年以上', hint: '高阶 / 偏管理+战略' },
];

export const STRUCTURE_OPTIONS: { value: ResumeStructure; label: string; hint: string }[] = [
  { value: 'vertical', label: '上下结构', hint: '一栏到底，板块分明' },
  { value: 'horizontal', label: '左右两栏', hint: '左侧基本信息+技能，右侧项目' },
  { value: 'card', label: '项目卡片', hint: '每个项目独立卡片，量化突出' },
];

/** 高亮可选字段—— 学生选哪些维度在简历里重点突出 */
export const HIGHLIGHT_OPTIONS = [
  '量化结果',
  '行业场景',
  '技术工具',
  '团队角色',
  '规则方法论',
  '项目周期',
  'Bad Case 归因',
  '评测维度数',
] as const;

export const INDUSTRY_OPTIONS = INDUSTRIES.map((c) => c.name);

/** 课程项目（V3 沿用 V2 修正版） */
export const COURSE_PROJECT_OPTIONS = [
  'RAG 数据质量评估',
  'CoT 推理过程标注',
  'SFT 数据生产（单轮 / 多轮）',
  'RLHF 偏好标注',
  'Agent ReAct 轨迹标注',
  '多模态 T2I 文生图评测',
  '多模态 T2V 文生视频评测',
  'VLM 视觉语言模型评测',
  '多模型横评',
  'Dify SFT 数据自动合成',
  '小组评测路演',
] as const;

/** 模型 / 工具选项（限选 3-5）。V3 沿用 V2 删"标注方法"后的 3 组 */
export const MODEL_TOOL_OPTIONS = {
  模型: [
    'GPT-4', 'Claude', '豆包', 'DeepSeek', '千问',
    '文心一言', 'Gemini', 'Sora', '可灵', '海螺',
  ],
  评测框架: ['OpenCompass', 'SuperCLUE'],
  自动化工具: ['Dify', '火山引擎', 'Label Studio', 'Coze'],
} as const;

export const MODEL_TOOL_MIN = 3;
export const MODEL_TOOL_MAX = 5;

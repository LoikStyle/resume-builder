/**
 * 段 0 追问表单题目配置（V2）
 *
 * V2 改动：
 *   - 删了：方向偏好 / 在项目中的角色 / 量化亮点 / 标注方法
 *   - 加了：工作年限 / 行业大类（单选）/ AI 动态细分场景
 *   - 项目和工具的选项扩展
 */

import { INDUSTRIES } from '@/lib/industries';

export type WorkYearsOption = { value: '0' | '<1' | '1-3' | '>3'; label: string };

export const WORK_YEARS_OPTIONS: WorkYearsOption[] = [
  { value: '0', label: '应届，无实习' },
  { value: '<1', label: '1 年内（有实习）' },
  { value: '1-3', label: '1-3 年' },
  { value: '>3', label: '3 年以上' },
];

export const INDUSTRY_OPTIONS = INDUSTRIES.map((c) => c.name);

/** 课程项目（V2 扩展） */
export const COURSE_PROJECT_OPTIONS = [
  'RAG 知识库 Q-R-R 三元评估',
  'CoT 推理过程标注',
  'SFT 数据生产（单轮 / 多轮）',
  'RLHF 偏好标注',
  'Agent ReAct 轨迹标注',
  '多模态 T2I 文生图评测',
  '多模态 T2V 文生视频评测',
  'VLM 视觉语言模型评测',
  '多模型横评（5+ 款对比）',
  'Dify SFT 数据自动合成',
  '小组评测路演',
] as const;

/** 模型 / 工具选项（限选 3-5）。后期接 LMSYS 榜单 */
export const MODEL_TOOL_OPTIONS = {
  模型: [
    'GPT-4', 'Claude', '豆包', 'DeepSeek', '千问',
    '文心一言', 'Gemini', 'Sora', '可灵', '海螺',
  ],
  评测框架: ['OpenCompass', 'SuperCLUE'],
  自动化工具: ['Dify', '火山引擎', 'Label Studio', 'Coze'],
  标注方法: ['ReAct', 'CoT', 'RLHF', 'SFT', 'DPO', 'Golden Set', 'AQL', 'Q+R+R'],
} as const;

export const MODEL_TOOL_MIN = 3;
export const MODEL_TOOL_MAX = 5;

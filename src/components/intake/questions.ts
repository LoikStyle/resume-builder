/**
 * 段 0 追问表单题目配置（V3.1）
 *
 * V3.1 改动：
 *   - 表单顺序：项目（前置）→ 大类 → AI 年限 → 高亮 → 结构
 *   - 删除 modelsTools 字段（不让学生勾，扣子工作流根据项目推断工具，写到生成的"个人优势"里）
 *   - 结构选项扩到 6 个（对应可画 6 份模板）
 *   - 高亮选项细化（前端字段维度，未来扩句子级）
 */

import { INDUSTRIES } from '@/lib/industries';
import type { AIIndustryYears, ResumeStructure } from '@/lib/schema/resume';

export const AI_YEARS_OPTIONS: { value: AIIndustryYears; label: string; hint: string }[] = [
  { value: '<6m', label: '不到半年', hint: '应届 / 刚入行' },
  { value: '6m-1y', label: '半年-1 年', hint: '初级训练师' },
  { value: '1-2y', label: '1-2 年', hint: '中阶 / 偏执行+局部规则' },
  { value: '>2y', label: '2 年以上', hint: '高阶 / 偏管理+战略' },
];

/** 6 种结构风格（对应可画 6 份模板的视觉特征） */
export const STRUCTURE_OPTIONS: {
  value: ResumeStructure;
  label: string;
  layout: string;
  hint: string;
}[] = [
  {
    value: 'minimal-bw',
    label: '极简黑白',
    layout: '上下结构',
    hint: '黑色块状标题 / 留白多 / 适合传统正式岗',
  },
  {
    value: 'blue-fresh',
    label: '蓝色应届',
    layout: '上下结构',
    hint: '蓝色圆角块标题 / 应届生通用 / 清爽',
  },
  {
    value: 'blue-marketing',
    label: '蓝白市场',
    layout: '上下结构',
    hint: '蓝白配色 / 营销/产品/运营岗 / 略活泼',
  },
  {
    value: 'business-gray',
    label: '灰白商务',
    layout: '左右两栏',
    hint: '紫蓝渐变 / 左信息右项目 / 互联网产品运营',
  },
  {
    value: 'business-internship',
    label: '商务实习',
    layout: '左右两栏',
    hint: '商务正式 / 适合实习生 / 简洁',
  },
  {
    value: 'purple-teacher',
    label: '紫白教师',
    layout: '卡片式',
    hint: '紫白配色 / 卡片化 / 教师 / 学术 / 专业向',
  },
];

/** 高亮可选字段—— 学生选哪些维度在简历里重点突出
 *  V3.1：前端先做字段维度选择；未来在编辑器里学生可点选具体哪句话标高亮
 */
export const HIGHLIGHT_OPTIONS = [
  '量化结果（评测维度数 / 模型对比数）',
  '行业场景（小红书 / 电商 / 多模态等）',
  '团队角色（独立完成 / 主导规则 / 质检负责）',
  '规则方法论（标注规范 / Bad Case 归因 / Golden Set）',
  'AI 行业年限',
  '具体项目名（用粗体突出 RAG / Agent / 多模态 等）',
  '工具熟悉度（GPT-4 / Claude / Dify / OpenCompass）',
  '量化亮点 bullet（最优结果一句话）',
] as const;

export const INDUSTRY_OPTIONS = INDUSTRIES.map((c) => c.name);

/** 课程项目（V3.1 沿用） */
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

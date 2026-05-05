/**
 * 段 0 追问表单题目配置
 * 表单顺序：项目 → 行业大类 + 二级标签 → 细分场景（AI 生成） → AI 年限 → 高亮
 */

import type { AIIndustryYears, ProjectDirection } from '@/lib/schema/resume';

/** 模型方向（一级输入，对齐扣子工作流的 project_type 字段） */
export const PROJECT_DIRECTION_OPTIONS: { value: ProjectDirection; label: string; hint: string }[] = [
  { value: '多模态', label: '多模态', hint: '文生图 / 文生视频 / VQA / Caption 等' },
  { value: '文本模型', label: '文本模型', hint: 'SFT / RAG / CoT / Agent / RM 等' },
  { value: '混合', label: '混合', hint: '两种都做过' },
  { value: '通用美学', label: '通用美学', hint: '实习生 / 大厂通用线 / 不细分垂类' },
];

export const AI_YEARS_OPTIONS: { value: AIIndustryYears; label: string; hint: string }[] = [
  { value: '1y', label: '1 年', hint: '初级训练师 / 独立模块负责' },
  { value: '2y', label: '2 年', hint: '中高阶 / 主导规则 + 跨职能协同' },
];

/**
 * 课程项目（3 组平级，每个任务独立 chip）：
 *   - 文本标注：文本/语音类标注
 *   - 模型评测：文本/语音类评测
 *   - 多模态：图/视频类（标注 + 评测合一，多模态学生通常做端到端）
 */
export const COURSE_PROJECT_GROUPS: { group: string; items: string[] }[] = [
  {
    group: '文本标注',
    items: [
      'SFT 对话数据标注',
      'CoT 推理过程标注',
      'RAG 文档/Chunk 标注',
      'ASR 语音转写标注',
    ],
  },
  {
    group: '模型评测',
    items: [
      'LLM 文本对话评测',
      '角色扮演 / 情感陪伴评测',
      '长文本生成评测（小红书 / 公众号 / 知乎）',
      'ASR 语音识别评测',
      '音频理解评测',
      '多模型横评 / GSB 盲测',
    ],
  },
  {
    group: '多模态',
    items: [
      'T2I 文生图评测',
      'T2V 文生视频评测',
      'I2V 图生视频评测',
      'VLM 视觉理解评测',
      'VQA 视觉问答标注',
      'Image Caption 图像描述标注',
    ],
  },
];

export const COURSE_PROJECT_OPTIONS = COURSE_PROJECT_GROUPS.flatMap((g) => g.items);

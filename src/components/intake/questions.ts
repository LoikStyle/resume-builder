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

/** V3.2：1-2y 和 >2y 合并（用户决策：这两档训练师岗位描述特征接近） */
export const AI_YEARS_OPTIONS: { value: AIIndustryYears; label: string; hint: string }[] = [
  { value: '<6m', label: '不到半年', hint: '应届 / 刚入行 / 偏执行' },
  { value: '6m-1y', label: '半年-1 年', hint: '初级训练师 / 局部规则参与' },
  { value: '1y+', label: '1 年以上', hint: '中阶/高阶 / 主导规则 + 跨职能协同' },
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

/** 高亮可选字段—— V3.2 细化到 16 项
 *  分组：量化指标 / 方法论 / 工具与模型 / 业务能力
 *  前端先做字段维度选择；未来在结果页可点选具体哪句话标高亮
 */
export const HIGHLIGHT_OPTIONS = [
  // 量化指标（最容易让 HR 一眼看到）
  '评测维度数（"5 维度评分体系"）',
  '模型对比数（"6 款主流模型横评"）',
  '场景覆盖数（"覆盖美妆/旅行/数码 等 N 类"）',
  'Bad Case 类别数（"归纳 5 类高频 Bad Case"）',
  '数据规模（数千条 / 万级别 / 全量验收）',
  '评测报告数量（"输出 N 份评测报告"）',
  '拦截率 / 通过率提升',
  '标注一致性 / 黄金集 Kappa',
  // 方法论 & 流程
  '标注规则文档（决策树 / 边界 case）',
  '端到端流程（承接需求 → 复盘交付）',
  'Bad Case 归因报告 + 改进建议',
  'Prompt 工程能力（temperature / top_p 调优）',
  // 工具与模型
  '具体项目名（RAG / Agent / 多模态 / VLM 等）',
  '工具熟悉度（GPT-4 / Claude / Dify / OpenCompass）',
  // 业务与软实力
  '行业场景（小红书 / 电商 / 短视频等）',
  '跨团队协同 / 项目管理',
] as const;

export const INDUSTRY_OPTIONS = INDUSTRIES.map((c) => c.name);

/** 课程项目（V3.2 按笔记全量扩展，21 项）
 *  分组：对话/SFT、推理/CoT、偏好/RLHF、Agent、多模态、专项垂类、横评、自动化
 */
export const COURSE_PROJECT_OPTIONS = [
  // 对话 / SFT
  'SFT 单轮对话标注',
  'SFT 多轮对话标注',
  // 推理
  'CoT 推理过程标注',
  // 偏好对齐
  'RLHF 偏好标注',
  'DPO 偏好对标注',
  // 检索
  'RAG 数据质量评估',
  // Agent
  'Agent ReAct 轨迹标注',
  'Agent Tool 调用质量评测',
  // 多模态 - 视觉
  '多模态 T2I 文生图评测',
  '多模态 T2V 文生视频评测',
  'VLM 视觉语言模型评测',
  'VQA 视觉问答标注',
  '图像描述（Image Caption）标注',
  // 多模态 - 音视频
  'TTS 文字转语音评测',
  'ASR 语音识别标注',
  '数字人 / 配音评测',
  // 专项垂类
  '角色扮演数据标注 / 评测',
  '视频生成 / 短剧脚本评测',
  '世界模型 / 具身智能评测',
  // 横评 + 自动化
  '多模型横评',
  'Dify SFT 数据自动合成',
  '小组评测路演',
] as const;

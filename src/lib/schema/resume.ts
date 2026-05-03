import { z } from 'zod';

/** AI 训练师/评测岗位简历 Schema */
export const BasicSchema = z.object({
  name: z.string(),
  objective: z.string(),
  phone: z.string(),
  email: z.string(),  // 不强校验邮箱格式，Claude 可能填占位符；学生在编辑器里改
  birth: z.string().optional(),
  hometown: z.string().optional(),
  politicalStatus: z.string().optional(),
  photo: z.string().optional(),
});

export const EducationSchema = z.object({
  period: z.string(),
  school: z.string(),
  major: z.string(),
  degree: z.enum(['本科', '硕士', '博士']).optional(),
  gpa: z.string().optional(),
  courses: z.string().optional(),
});

export const ExperienceTypeEnum = z.enum([
  'internship',
  'training_project',
  'campus',
  'competition',
]);

// V2 改宽松：taskType / dataModality 是元数据 tag（仅前端 chip 显示用），
// Claude 在规则维度参考下会自由发挥（"评测维度设计"、"Bad Case 归因"等），
// 强 enum 反而频繁触发校验失败。
export const TaskTypeEnum = z.string();
export const DataModalityEnum = z.string();

export const ExperienceSchema = z.object({
  id: z.string(),
  type: ExperienceTypeEnum,
  period: z.string().optional(),
  org: z.string(),
  role: z.string(),
  background: z.string(),
  actions: z.array(z.string()).min(2),
  results: z.array(z.string()).min(1),
  taskType: z.array(TaskTypeEnum).optional(),
  dataModality: z.array(DataModalityEnum).optional(),
  modelsUsed: z.array(z.string()).optional(),
  toolsUsed: z.array(z.string()).optional(),
});

export const SkillSchema = z.object({
  name: z.string(),
  level: z.enum(['了解', '熟练', '精通']).optional(),
  category: z.enum(['模型', '评测框架', '标注方法', '自动化工具', '通用']).optional(),
});

export const ResumeSchema = z.object({
  basic: BasicSchema,
  selfEvaluation: z.string().max(300),
  education: z.array(EducationSchema).min(1),
  experiences: z.array(ExperienceSchema).min(4).max(6),
  skills: z.array(SkillSchema),
  honors: z.array(z.string()).optional(),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Education = z.infer<typeof EducationSchema>;

export type TemplateKind = 'dense' | 'loose' | 'structured';

/** 段 0 追问表单的回答结构（V3.1）
 *  V3.1 改动：
 *   - 表单顺序调整：项目（前置）→ 大类 → AI 年限 → 高亮 → 结构
 *   - 删除 modelsTools 字段（融入个人优势，扣子工作流生成时根据项目推断工具）
 *   - 结构选项扩展到 6 个（对应 6 份可画模板风格）
 *   - 高亮字段保留（前端字段维度选；未来扩到句子级）
 *  保留 WorkYears 类型导出，避免破坏 V2 demo 链路里的 prompt 引用
 */
export type WorkYears = '0' | '<1' | '1-3' | '>3';
/** V3.2：1-2y 和 >2y 合并成 1y+（用户决策：训练师岗这两档表现接近） */
export type AIIndustryYears = '<6m' | '6m-1y' | '1y+';
export type ResumeStructure =
  | 'minimal-bw'              // 黑白极简（上下）
  | 'blue-fresh'              // 蓝色应届（上下）
  | 'blue-marketing'          // 蓝白市场营销（上下）
  | 'business-gray'           // 灰白商务（左右）
  | 'business-internship'     // 灰白商务实习（左右）
  | 'purple-teacher';         // 紫白教师（卡片）

export type IntakeAnswers = {
  /** 做过的项目（V3.1 前置） */
  courseProjects: string[];
  /** 自定义补充：例如选了"小组评测路演"后填的具体场景 */
  pathwayScene?: string;
  /** 行业大类（单选 1 个，来自 INDUSTRIES 列表） */
  industryCategory: string;
  /** 细分场景（AI 动态生成后多选 1-3 个） */
  subScenarios: string[];
  /** AI 行业年限——决定项目深度 */
  aiIndustryYears: AIIndustryYears;
  /** 高亮字段——决定后端工作流着重突出哪些字段 */
  highlightFields: string[];
  /** 简历结构偏好——6 选 1 */
  resumeStructure: ResumeStructure;

  /** V2 兼容：从 aiIndustryYears 派生，给 demo 链路读 */
  workYears?: WorkYears;
};

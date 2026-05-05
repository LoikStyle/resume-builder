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

// taskType / dataModality 是元数据 tag（仅前端 chip 显示用），强 enum 易触发校验失败
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

/** 段 0 追问表单的回答结构 */
export type WorkYears = '0' | '<1' | '1-3' | '>3';
/** AI 行业年限：最低 1 年起 */
export type AIIndustryYears = '1y' | '2y';
/** 模型方向（对齐扣子工作流 project_type 字段）
 *  - 通用美学：实习生 / 大厂通用线，固化 PE，不走主线
 */
export type ProjectDirection = '多模态' | '文本模型' | '混合' | '通用美学';

export type IntakeAnswers = {
  /** 模型方向（必填，单选） */
  projectDirection: ProjectDirection;
  /** 项目类别（一级 group：数据标注 / 模型评测，多选） */
  courseProjectGroups: string[];
  /** 做过的项目（二级标签，从 COURSE_PROJECT_GROUPS 选中的具体任务） */
  courseProjects: string[];
  /** 行业大类（单选 1 个，来自 INDUSTRIES 列表） */
  industryCategory: string;
  /** 行业专业方向（单选，存为 0/1 元素数组以兼容旧 schema） */
  industrySubtags: string[];
  /** 细分场景（已下线，保留字段兼容） */
  subScenarios?: string[];
  /** AI 行业年限——决定项目深度 */
  aiIndustryYears: AIIndustryYears;

  /** 路演场景补充（可选） */
  pathwayScene?: string;
  /** 从 aiIndustryYears 派生，给老链路读 */
  workYears?: WorkYears;
};

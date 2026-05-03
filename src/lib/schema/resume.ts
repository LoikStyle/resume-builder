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

/** 段 0 追问表单的回答结构（V2） */
export type WorkYears = '0' | '<1' | '1-3' | '>3';

export type IntakeAnswers = {
  /** 工作年限——影响管理权重和动词选择 */
  workYears: WorkYears;
  /** 行业大类（单选 1 个，来自 INDUSTRIES 列表） */
  industryCategory: string;
  /** 细分场景（AI 动态生成后多选 1-3 个） */
  subScenarios: string[];
  /** 做过的项目（课程项目类型多选） */
  courseProjects: string[];
  /** 自定义补充：例如选了"小组评测路演"后填的具体场景 */
  pathwayScene?: string;
  /** 用过的模型 / 工具（多选，限 3-5 个） */
  modelsTools: string[];
};

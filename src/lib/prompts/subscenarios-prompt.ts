import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * 细分场景生成 PE
 *
 * Prompt 模板存在 src/lib/prompts/subscenarios.prompt.txt，
 * 通过 admin 调试页可以热更新此文件而无需重新部署代码。
 *
 * 占位符约定：
 *   {{CATEGORY}}        - 行业大类
 *   {{SUBTAGS}}         - 行业二级标签（中文逗号分隔）
 *   {{COURSE_PROJECTS}} - 课程项目（- 列表）
 *   {{TARGET_COUNT}}    - 目标场景数（默认 12）
 */

export type SubscenariosPromptInput = {
  category: string;
  direction: string;
  subtags: string[];
  courseProjects: string[];
  targetCount?: number;
};

export const TARGET_COUNT_DEFAULT = 20;

/** PE 类型：main = 主线（多模态/文本/混合）；aesthetic = 实习/大厂通用美学固化 case */
export type PromptKind = 'main' | 'aesthetic';

const PROMPT_FILES: Record<PromptKind, string> = {
  main: path.resolve(process.cwd(), 'src/lib/prompts/subscenarios.prompt.txt'),
  aesthetic: path.resolve(process.cwd(), 'src/lib/prompts/subscenarios-aesthetic.prompt.txt'),
};

export function pickPromptKind(direction: string): PromptKind {
  return direction === '通用美学' ? 'aesthetic' : 'main';
}

/** 读取 prompt 模板文件——每次都重新读，避免改文件后老 cache 持久。 */
export async function loadPromptTemplate(kind: PromptKind = 'main'): Promise<string> {
  return fs.readFile(PROMPT_FILES[kind], 'utf-8');
}

export async function savePromptTemplate(content: string, kind: PromptKind = 'main'): Promise<void> {
  await fs.writeFile(PROMPT_FILES[kind], content, 'utf-8');
}

export function fillPromptTemplate(template: string, input: SubscenariosPromptInput): string {
  const subtagsLine = input.subtags.length
    ? input.subtags.join('、')
    : '（学生未细分，按行业大类通用方向展开）';
  const projectsLine = input.courseProjects.length
    ? input.courseProjects.map((p) => `- ${p}`).join('\n')
    : '（学生未勾选项目，按行业大类常见 AI 训练师任务展开）';
  const target = input.targetCount ?? TARGET_COUNT_DEFAULT;

  return template
    .replace(/{{CATEGORY}}/g, input.category)
    .replace(/{{DIRECTION}}/g, input.direction || '（未指定）')
    .replace(/{{SUBTAGS}}/g, subtagsLine)
    .replace(/{{COURSE_PROJECTS}}/g, projectsLine)
    .replace(/{{TARGET_COUNT}}/g, String(target));
}

export async function buildSubscenariosPrompt(input: SubscenariosPromptInput): Promise<string> {
  const kind = pickPromptKind(input.direction);
  const template = await loadPromptTemplate(kind);
  return fillPromptTemplate(template, input);
}

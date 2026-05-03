/**
 * Day 1 数据切分脚本：把 data/jds-raw/*.{txt,md,pdf,docx} 切成 JD 段落 JSON
 *
 * 用法：
 *   1. 把真实 JD 放到 data/jds-raw/（每个 JD 一个文件）
 *   2. npx tsx scripts/extract-jd.ts
 *   3. 输出 data/jd_segments.json
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { callClaude, extractJson } from '../src/lib/claude-client';

const RAW_DIR = join(process.cwd(), 'data', 'jds-raw');
const OUT_FILE = join(process.cwd(), 'data', 'jd_segments.json');

const SPLIT_PROMPT_TEMPLATE = `你是 AI 训练师 JD 结构化工程师。把下面这份岗位 JD 拆成 3 段段落，每段一条记录：

[
  {
    "id": "jd_001 类格式",
    "company": "公司名",
    "role_title": "岗位名",
    "segment_type": "requirements",   // 任职要求
    "segment_text": "原文 / 整理后的能力要求段落，含技能、工具、方法",
    "sub_direction": ["对话/SFT","RAG","Agent","评测","..."],
    "must_have_skills": ["关键能力1","关键能力2"],
    "is_trainer": true   // 是否是 AI 训练师/评测岗（true|false）
  },
  {
    ...
    "segment_type": "scenario",   // 业务场景
    "segment_text": "围绕什么业务/场景做事的描述",
    ...
  },
  {
    ...
    "segment_type": "keywords",   // 关键词/动词
    "segment_text": "高频术语、量化偏好、项目动词、避免词的总结",
    ...
  }
]

只输出 JSON 数组，不要说明、不要 markdown 代码块。

JD 原文：
---
{{jd_text}}
---`;

async function extractText(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse');
    const buf = await readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const result = await parser.getText();
      return (result.text ?? '') as string;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === '.docx' || ext === '.doc') {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ path: filePath })).value;
  }
  return await readFile(filePath, 'utf-8');
}

async function main() {
  let files: string[];
  try {
    files = (await readdir(RAW_DIR)).filter((f) =>
      ['.pdf', '.docx', '.doc', '.txt', '.md'].includes(extname(f).toLowerCase())
    );
  } catch {
    console.error(`目录不存在：${RAW_DIR}`);
    process.exit(1);
  }

  if (!files.length) {
    console.error(`${RAW_DIR} 是空的`);
    process.exit(1);
  }

  console.log(`发现 ${files.length} 份 JD，开始切分：\n`);

  const all: Array<Record<string, unknown>> = [];
  let seq = 1;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const filePath = join(RAW_DIR, f);
    console.log(`[${i + 1}/${files.length}] ${f}`);
    try {
      const text = (await extractText(filePath)).replace(/\s+/g, ' ').trim();
      if (text.length < 50) {
        console.log('  ⚠️  正文太短');
        continue;
      }
      const prompt = SPLIT_PROMPT_TEMPLATE.replace('{{jd_text}}', text);
      const startedAt = Date.now();
      const reply = await callClaude(prompt, { timeoutMs: 240_000 });
      const segments = extractJson<Array<Record<string, unknown>>>(reply);

      const list = Array.isArray(segments) ? segments : [];
      for (const s of list) {
        s.id = `jd_${String(seq++).padStart(3, '0')}`;
        s.source_file = f;
      }
      all.push(...list);
      console.log(
        `  ✅ ${list.length} 段，耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
      );
    } catch (e) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await writeFile(OUT_FILE, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`\n✅ 完成：${all.length} 段 → ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * V2：把 JD 切成大段（岗位职责 + 任职要求合并），保留完整上下文
 *
 * 用法：
 *   1. 把真实 JD 放到 data/jds-raw/
 *   2. npm run extract-jd-blocks
 *   3. 输出 data/jd_blocks.json（覆盖 mock）
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { callClaude, extractJson } from '../src/lib/claude-client';

const RAW_DIR = join(process.cwd(), 'data', 'jds-raw');
const OUT_FILE = join(process.cwd(), 'data', 'jd_blocks.json');

const PROMPT = `你是 AI 训练师 JD 整理专家。

把下面这份 JD 整理成一条记录（不切成多段），把岗位职责和任职要求合并写在 block 字段里，保留完整上下文。

输出 JSON 对象（不是数组）：
{
  "id": "jdb_001 类格式",
  "company": "公司名（如果 JD 里没写就填'未注明'）",
  "role_title": "岗位名",
  "block": "完整描述，把'职责：...要求：...'合并成连贯段落",
  "is_trainer": true | false (是否 AI 训练师/评测岗)
}

只输出 JSON 对象，不要说明、不要 markdown 代码块。

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
      return ((await parser.getText()).text ?? '') as string;
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

  console.log(`发现 ${files.length} 份 JD，按"大段"切：\n`);

  const all: Array<Record<string, unknown>> = [];
  let seq = 1;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    console.log(`[${i + 1}/${files.length}] ${f}`);
    try {
      const text = (await extractText(join(RAW_DIR, f))).replace(/\s+/g, ' ').trim();
      if (text.length < 50) {
        console.log('  ⚠️  正文太短');
        continue;
      }
      const t0 = Date.now();
      const reply = await callClaude(PROMPT.replace('{{jd_text}}', text), {
        timeoutMs: 240_000,
      });
      const block = extractJson<Record<string, unknown>>(reply);
      block.id = `jdb_${String(seq++).padStart(3, '0')}`;
      block.source_file = f;
      all.push(block);
      console.log(
        `  ✅ ${block.role_title || '?'}@${block.company || '?'} (trainer=${block.is_trainer})，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`
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

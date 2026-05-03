/**
 * V2 切分方案 A：按"项目维度"切规则片段
 *
 * 用法：
 *   1. 把真实简历放到 data/resumes-raw/
 *   2. npm run extract-rules-by-project
 *   3. 输出 data/resume_rules.json（覆盖 mock）
 *
 * 切法：每份简历的每个项目抽 1 条"规则维度方法论描述"。
 * 总共大约 50 份 × 4-6 项目 = 200-300 条规则片段。
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { callClaude, extractJson } from '../src/lib/claude-client';

const RAW_DIR = join(process.cwd(), 'data', 'resumes-raw');
const OUT_FILE = join(process.cwd(), 'data', 'resume_rules.json');

const PROMPT = `你是 AI 训练师简历规则维度抽取专家。

从下面这份简历的每个项目中，**只抽取做事方法论**（不是项目内容），输出 JSON 数组。

每条片段必须是"规则维度描述"——回答"这个项目里他是怎么做事的"，例如：
- "针对 X 场景，制定 N 维度评分体系（含正反 case），多人盲标对齐"
- "建立 Golden Set + AQL 抽检，保证大批量数据下游可用率"
- "Q-R-R 三层审查（问题/材料/回答），逐层定位 RAG 失败根因"

不是"做了什么项目"，而是**做事的方法论 / 流程 / 维度**。

每条 schema：
{
  "id": "rule_001 类格式",
  "rule_dimension": "做事维度名（如评测维度设计 / Bad Case 归因 / Golden Set 质检）",
  "task_type": "评测 | 标注 | 数据生产 | 规则设计 | 质检 | Prompt工程 | 多模型对比",
  "fragment": "完整方法论描述，30-100 字，**禁止写具体数据量**（用'数千条'/'万级别'/'全量验收'）",
  "source": "项目名（如电商商品图评测项目）",
  "style": "用词风格（如结构化 / 归纳派 / 范式派 / 工程派）"
}

只输出 JSON 数组，不要说明、不要 markdown 代码块。如果某项目没有可识别的方法论，跳过该项目。

简历正文：
---
{{resume_text}}
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

  console.log(`发现 ${files.length} 份简历，按"项目维度"切规则片段：\n`);

  const all: Array<Record<string, unknown>> = [];
  let seq = 1;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    console.log(`[${i + 1}/${files.length}] ${f}`);
    try {
      const text = (await extractText(join(RAW_DIR, f))).replace(/\s+/g, ' ').trim();
      if (text.length < 80) {
        console.log('  ⚠️  正文太短，跳过');
        continue;
      }
      const t0 = Date.now();
      const reply = await callClaude(PROMPT.replace('{{resume_text}}', text), {
        timeoutMs: 240_000,
      });
      const list = extractJson<Array<Record<string, unknown>>>(reply);
      const arr = Array.isArray(list) ? list : [];
      for (const r of arr) {
        r.id = `rule_${String(seq++).padStart(3, '0')}`;
        r.source_file = f;
      }
      all.push(...arr);
      console.log(
        `  ✅ ${arr.length} 条规则片段，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    } catch (e) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await writeFile(OUT_FILE, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`\n✅ 完成：${all.length} 条规则片段 → ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

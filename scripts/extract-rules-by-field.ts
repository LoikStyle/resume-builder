/**
 * V2 切分方案 B：按"字段级"切规则片段（更细粒度）
 *
 * 用法：
 *   npm run extract-rules-by-field
 *   输出 data/resume_rules_by_field.json（不覆盖方案 A，方便对比）
 *
 * 切法：把每份简历整体扫一遍，按字段类型抽：
 *   - 标注规范（撰写规则文档）
 *   - 评分维度（搭建评测体系）
 *   - Bad Case 分析（归因 / 分类）
 *   - 流程管理（团队 / 节奏 / 质检）
 *   - 多模型对比（对比方法论）
 * 每个字段类型 0-N 条。比方案 A 更细更分散。
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { callClaude, extractJson } from '../src/lib/claude-client';

const RAW_DIR = join(process.cwd(), 'data', 'resumes-raw');
const OUT_FILE = join(process.cwd(), 'data', 'resume_rules_by_field.json');

const FIELD_TYPES = [
  '标注规范撰写',
  '评分维度设计',
  'Bad Case 归因分析',
  '流程 / 质检管理',
  '多模型对比方法',
  'Prompt 工程 / 数据合成',
] as const;

const PROMPT = `你是 AI 训练师简历规则维度抽取专家（字段级切法）。

把整份简历从头到尾扫一遍，按下面 6 个字段类型抽取**做事方法论**（不是项目内容）。每个字段类型可有 0-N 条；如果简历里没体现某字段类型，就跳过该字段。

字段类型：
${FIELD_TYPES.map((t) => '  - ' + t).join('\n')}

每条 schema：
{
  "id": "rule_001 类格式",
  "field_type": "<上面 6 个字段类型之一>",
  "fragment": "完整方法论描述，30-100 字，**禁止写具体数据量**（用'数千条'/'万级别'/'全量验收'）",
  "source_project": "出自哪个项目（如电商商品图评测项目）",
  "style": "用词风格（结构化 / 归纳派 / 范式派 / 工程派）"
}

只输出 JSON 数组，不要说明、不要 markdown 代码块。如果整份简历都没有可抽取的字段，返回 []。

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

  console.log(`发现 ${files.length} 份简历，按"字段级"切规则片段：\n`);

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
        `  ✅ ${arr.length} 条字段级片段，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    } catch (e) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await writeFile(OUT_FILE, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`\n✅ 完成：${all.length} 条字段级片段 → ${OUT_FILE}`);
  console.log('对比方案 A：可同时跑 generate API 用两套数据，看哪套生成质量更好');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

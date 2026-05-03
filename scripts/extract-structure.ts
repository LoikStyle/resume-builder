/**
 * V2：从结构样本简历中提取视觉结构特征
 *
 * 用法：
 *   1. 把结构多样的简历样本放到 data/structure-samples-raw/（PDF 即可，需要视觉结构信息）
 *   2. npm run extract-structure
 *   3. 输出 data/structure_samples.json（覆盖 mock）
 *
 * 注意：纯文本提取无法保留视觉信息。这里我们用 Claude 直接读 PDF 文件
 *      （Claude Code CLI 支持 PDF 读取），让模型基于视觉布局描述结构特征。
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { callClaude, extractJson } from '../src/lib/claude-client';

const RAW_DIR = join(process.cwd(), 'data', 'structure-samples-raw');
const OUT_FILE = join(process.cwd(), 'data', 'structure_samples.json');

const PROMPT = `你是简历视觉结构分析专家。

下面这份简历样本，仅提取**视觉结构特征**（不要分析内容质量、不要提取信息）。

输出 JSON 对象：
{
  "id": "structure_001 类格式",
  "layout": "上下结构 | 左右两栏 | 项目卡片 | 模块横排（看主体布局）",
  "title_style": "板块标题样式（如：黑色实心块状 / 蓝色描边带图标 / 彩色圆角 / 下划线 + 编号）",
  "highlight_style": "重点高亮方式（如：数字加粗 / 关键词标蓝 / 整段背景色 / 边框框起）",
  "section_order": ["按出现顺序的板块名数组，如 [基本信息, 教育背景, 实习, 项目, 技能, 自评]"],
  "visual_signature": "整体调性一句话（如：极简学院风 / 工程师卡片风 / 商务报告风 / 学术论文风）",
  "good_for": "适合什么类型的岗位（如：传统行业 / 互联网产品运营 / 大厂算法 / 海外申请）"
}

只输出 JSON 对象，不要说明、不要 markdown 代码块。

注意：你只能从我给你的简历正文 + 结构线索（标题缩进、空行、特殊符号）推断布局，不要编造视觉特征。

简历正文（含原始格式）：
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
    console.error('请先把结构样本简历放到该目录');
    process.exit(1);
  }
  if (!files.length) {
    console.error(`${RAW_DIR} 是空的`);
    process.exit(1);
  }

  console.log(`发现 ${files.length} 份结构样本，开始提取视觉特征：\n`);

  const all: Array<Record<string, unknown>> = [];
  let seq = 1;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    console.log(`[${i + 1}/${files.length}] ${f}`);
    try {
      const text = await extractText(join(RAW_DIR, f));
      if (text.length < 80) {
        console.log('  ⚠️  正文太短，跳过');
        continue;
      }
      const t0 = Date.now();
      const reply = await callClaude(PROMPT.replace('{{resume_text}}', text), {
        timeoutMs: 180_000,
      });
      const sample = extractJson<Record<string, unknown>>(reply);
      sample.id = `structure_${String(seq++).padStart(3, '0')}`;
      sample.source_file = f;
      all.push(sample);
      console.log(
        `  ✅ ${sample.layout || '?'} / ${sample.visual_signature || '?'}，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`
      );
    } catch (e) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await writeFile(OUT_FILE, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`\n✅ 完成：${all.length} 套结构样本 → ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

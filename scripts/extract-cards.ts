/**
 * Day 1 数据切分脚本：把 data/resumes-raw/*.{pdf,docx} 切成训练师项目卡片 JSON
 *
 * 用法：
 *   1. 把真实简历放到 data/resumes-raw/（PDF 或 docx）
 *   2. npx tsx scripts/extract-cards.ts
 *   3. 输出落到 data/resume_cards.json，等待导入扣子知识库
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { callClaude, extractJson } from '../src/lib/claude-client';

const RAW_DIR = join(process.cwd(), 'data', 'resumes-raw');
const OUT_FILE = join(process.cwd(), 'data', 'resume_cards.json');

const SPLIT_PROMPT_TEMPLATE = `你是 AI 训练师简历结构化工程师。把下面这份简历拆成项目卡片数组。

每张项目卡片必须包含：
{
  "id": "card_001 类格式",
  "title": "项目名（如 RAG 知识库评估、多模型横评、小红书文案评测）",
  "industry": "电商|内容创作|教育|多模态|具身智能|RAG|Agent|金融|其他",
  "sub_direction": "文生图|短剧|对话|推荐|搜索|风控|评测|标注|RAG|RLHF|CoT|Agent|其他",
  "task_type": ["标注","评测","数据生产","规则设计","质检"],
  "data_modality": ["对话/SFT","CoT","RLHF","RAG","Agent","多模态-图","多模态-视频","多模态-音"],
  "models_used": ["GPT-4","Claude","豆包","DeepSeek","千问","文心一言","Gemini","Sora","可灵","..."],
  "tools_used": ["OpenCompass","SuperCLUE","Dify","火山引擎","Label Studio","..."],
  "level": "应届|实习|社招",
  "metric_type": "维度数|模型对比数|覆盖场景|Bad Case分类|拦截率|无量化",
  "card_text": "完整 STAR 描述（背景-行动-结果），保留原始用词；不要写数据量绝对值（如标注10万条），改用'数千条'/'万级别'/'全量验收'等模糊量化",
  "style_signature": "用词风格简评（量化派/描述派/学术派/实战派）"
}

只输出 JSON 数组（用 [] 包起来），不要任何说明文字、不要 markdown 代码块。如果简历里没有可识别的项目，返回 []。

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
      const result = await parser.getText();
      return (result.text ?? '') as string;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === '.docx' || ext === '.doc') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  if (ext === '.txt' || ext === '.md') {
    return await readFile(filePath, 'utf-8');
  }
  throw new Error(`不支持的格式：${ext}（${filePath}）`);
}

async function main() {
  let files: string[];
  try {
    files = (await readdir(RAW_DIR)).filter((f) =>
      ['.pdf', '.docx', '.doc', '.txt', '.md'].includes(extname(f).toLowerCase())
    );
  } catch {
    console.error(`目录不存在：${RAW_DIR}`);
    console.error('请先把简历文件放到该目录下');
    process.exit(1);
  }

  if (!files.length) {
    console.error(`${RAW_DIR} 是空的，没有可处理的简历`);
    process.exit(1);
  }

  console.log(`发现 ${files.length} 份简历，开始切分（每份 60-120 秒）：\n`);

  const allCards: Array<Record<string, unknown>> = [];
  let cardSeq = 1;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const filePath = join(RAW_DIR, f);
    console.log(`[${i + 1}/${files.length}] ${f}`);

    try {
      const text = await extractText(filePath);
      const trimmed = text.replace(/\s+/g, ' ').trim();
      if (trimmed.length < 80) {
        console.log('  ⚠️  正文太短，跳过');
        continue;
      }

      const prompt = SPLIT_PROMPT_TEMPLATE.replace('{{resume_text}}', trimmed);
      const startedAt = Date.now();
      const reply = await callClaude(prompt, { timeoutMs: 240_000 });
      const cards = extractJson<Array<Record<string, unknown>>>(reply);
      const list = Array.isArray(cards) ? cards : [];
      for (const c of list) {
        c.id = `card_${String(cardSeq++).padStart(3, '0')}`;
        c.source_file = f;
      }
      allCards.push(...list);
      console.log(
        `  ✅ ${list.length} 张卡片，耗时 ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
      );
    } catch (e) {
      console.log(`  ❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await writeFile(OUT_FILE, JSON.stringify(allCards, null, 2), 'utf-8');
  console.log(`\n✅ 切分完成：${allCards.length} 张卡片 → ${OUT_FILE}`);
  console.log('下一步：手工抽查 5-10 张确认 metadata 正确，然后导入扣子知识库');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

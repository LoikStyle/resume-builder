# AI 训练师简历生成器（POC）

面向求职 AI 训练师 / 评测方向的学生：一句话场景 + 6 题追问 → AI 生成结构化简历 JSON → 在线编辑 + 一键 PDF 导出。

## 三段链路

```
段 1【扣子检索】 学生输入 → 扣子工作流（意图+双路检索）→ 检索结果 JSON
段 2【Claude 生成】 Next.js 拼 prompt → 本地 claude --print → 严格 schema 简历 JSON
段 3【编辑导出】  JSON 渲染到 1/3 密度模板 → 左表单右预览 → Puppeteer 一键 PDF
```

POC 阶段段 1 未配扣子时 `coze-client` 自动用 `data/*.json` 作为 mock 检索结果。

## 启动

```bash
npm install      # 装依赖（已经装好）
npm run dev      # 启 dev server，访问 http://localhost:3000
```

**前提**：本地装了 Claude Code CLI 并已登录（`claude --version` 能跑）。

## 项目结构

```
src/
├── app/
│   ├── page.tsx              首页：场景输入
│   ├── intake/page.tsx       段 0 追问表单（基本信息 + 6 题）
│   ├── editor/page.tsx       编辑器
│   └── api/
│       ├── generate/         调扣子 + Claude
│       └── export-pdf/       Puppeteer 导出
├── components/
│   ├── intake/               段 0 表单 + 题目配置
│   ├── editor/               编辑器骨架 + 表单 + 预览
│   └── templates/            DenseTemplate / LooseTemplate / StructuredTemplate
├── lib/
│   ├── schema/resume.ts      Zod ResumeSchema（含训练师专属字段）
│   ├── claude-client.ts      child_process 调本地 claude CLI
│   ├── coze-client.ts        扣子工作流 HTTP，未配置时自动 mock
│   ├── render-html.ts        PDF 用的纯字符串模板（避 React Server 限制）
│   └── prompts/              Claude 生成 prompt 模板
└── store/
    └── resume-store.ts       Zustand + persist → localStorage

scripts/
├── extract-cards.ts          切 50 份真实简历 → 项目卡片 JSON
└── extract-jd.ts             切 100 份 JD → 段落 JSON

data/
├── resume_cards.json         POC 示例：10 张训练师项目卡片
├── jd_segments.json          POC 示例：6 段 AI 训练师 JD
├── resumes-raw/              真实简历（你来填，PDF/docx）
└── jds-raw/                  真实 JD（你来填）

coze/                         扣子工作流导出（你配完后扔这）
```

## 真实数据切分

**Day 1 关键步骤**——POC 用 mock 数据跑通了，要上真实质量必须做这步。

```bash
# 1. 把 50 份真实简历放到 data/resumes-raw/（PDF 或 docx）
# 2. 切分（每份 60-120 秒，50 份约 1-2 小时）
npm run extract-cards
# 3. 输出到 data/resume_cards.json，人工抽查 5-10 张

# 同理 JD：
# 1. 把 100 份 JD 放到 data/jds-raw/
npm run extract-jd
```

切完后导入扣子知识库（参考 plan 文件 `coze/workflow.json` 的 metadata schema）。

## 扣子工作流配置

未配置 `COZE_PAT` / `COZE_WORKFLOW_ID` 时，`coze-client` 自动读 `data/*.json` 作为 mock 检索结果——POC 直接能跑。

正式接入步骤：
1. 在 [扣子](https://www.coze.cn) 建空间
2. 导入两个知识库：`resume_cards`（项目卡片）+ `jd_segments`（JD 段落）
3. 搭 4 节点工作流：意图分类 LLM → 知识库节点 1 → 知识库节点 2 → End（返回 JSON）
4. 申请 PAT（[这里](https://www.coze.cn/open/oauth/pats)）
5. 在 `.env.local` 加：

```
COZE_PAT=pat_xxxxxxxxxx
COZE_WORKFLOW_ID=7xxxxxxxxxxxxx
```

## 环境变量

`.env.local`（POC 阶段不需要）：

```
# 扣子（可选，未配置时自动 mock 检索）
COZE_PAT=
COZE_WORKFLOW_ID=
COZE_BASE_URL=https://api.coze.cn   # 默认值

# v2 上云后才需要（POC 用本地 claude CLI 不需要）
# ANTHROPIC_API_KEY=
```

## 已知限制

- **生成耗时 3-4 分钟**：本地 Claude Code CLI 单次调用慢（含冷启动 + 长 prompt）。v2 切 Anthropic API 直连后压缩到 30-60 秒。
- **必须本地跑**：Vercel / Cloud Run 没有 `claude` 二进制。上云时改 `src/lib/claude-client.ts` 用 SDK 即可，外部接口签名不变。
- **三种密度页数差异**：dense 稳定 2 页 ✓；loose / structured 在 4 项目时偏向 3 页（卡片 / 留白占空间）。
- **简历库 / JD 库目前是 10 张 + 6 段示例**：基于课程笔记内容生成。真实 50 份简历未到位前，质量和示例水平相当。

## v1 → v2 上云切换

只动一个文件 `src/lib/claude-client.ts`：

```ts
// v1 (POC):
import { spawn } from 'node:child_process';
// child_process 调 claude CLI

// v2 (上云):
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
// SDK 调 API
```

调用方代码（`/api/generate/route.ts`）一行不动。

## 关键约束（请保持）

简历内容硬约束（已写进 prompt + schema）：

- ✅ **4-6 个项目**（schema min(4) max(6)）
- ✅ **两页 A4**（dense 模板能保证；prompt 限制 1200 字内）
- ✅ **不写项目周期**（experiences[].period 留空，只 education 写时间）
- ✅ **不写数据量绝对值**（学生不知道，每家公司不一样；用"数千条"/"万级别"/"全量验收"）
- ✅ **量化用训练师维度**（评测维度数 / 模型对比数 / 场景覆盖数 / Bad Case 类别数 / 拦截率），禁用算法岗指标（FID / 推理速度 / 训练 epoch）
- ✅ **禁用空话**（"参与了"/"协助"/"负责了"）

## 测试输出

`test-output.pdf` / `test-loose.pdf` / `test-structured.pdf` / `test-with-name.pdf` 是开发期生成的测试 PDF，可直接打开看。

## 完整 plan

`/Users/believe/.claude/plans/md-transient-thimble.md` 是完整方案。

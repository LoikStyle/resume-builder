# 扣子（Coze 国内版）搭建手册

> 目标：搭一个工作流，让我们的 Next.js 后端通过 HTTP 调用，返回检索结果（规则维度片段 + JD 大段 + 1 套结构样本）。
>
> 时间预算：**1.5-2 小时** 第一次搭。
>
> **注意**：不配也能跑（`coze-client.ts` 检测到 `COZE_PAT` / `COZE_WORKFLOW_ID` 缺失时自动用本地 `data/*.json` mock）。这份手册是想用真实知识库 RAG 时才用。

---

## 总体结构

```
扣子工作空间
├── 知识库 1: resume_rules          ← 简历规则维度片段
├── 知识库 2: jd_blocks             ← JD 大段
├── 知识库 3: structure_samples     ← 视觉结构样本
└── 工作流: resume_retrieval        ← 4 节点：意图 → 检索1 → 检索2 → 检索3 → End
```

---

## 第 1 步：注册 + 工作空间

1. 打开 https://www.coze.cn/，用手机号或抖音账号登录
2. 进入控制台后默认在「个人空间」工作空间。**直接在这里搭就行**，不用建团队空间。

---

## 第 2 步：建 3 个知识库

**入口**：左侧栏 → 工作空间 → 资源库 → 右上角 `+ 资源` → 知识库 → 文本格式

### 知识库 1：`resume_rules`

字段配置：
| 项 | 值 |
|---|---|
| 名称 | `resume_rules` |
| 描述 | "简历规则维度片段，按做事方法论切分" |
| 文件类型 | 文本 |

**导入数据**：
- 把项目里的 `data/resume_rules.json` 拖进来
- 切分方式选「**自定义**」：
  - 分段标识符：`,\n  {` （让每个 JSON 数组元素成为一个 chunk）
  - chunk_size：800（每条规则 100-300 字，留余量）
  - 重叠：0
- ⚠️ 如果扣子不直接支持 JSON 数组每项变独立 chunk，**fallback 方案**：把 `resume_rules.json` 转成纯文本，每条规则用 `===\n` 分隔，然后用 `===` 作为分隔符上传。我们提供一个转换脚本：见后文「附录 A」。

**Metadata 字段**（建库后在「设置 → 元数据」配置）：
| 字段 | 类型 |
|---|---|
| `id` | 字符串 |
| `rule_dimension` | 字符串 |
| `task_type` | 字符串 |
| `style` | 字符串 |
| `source` | 字符串 |

> ⚠️ 元数据 UI 在不同扣子版本里位置不同。如果建库时没看到元数据配置，建库后进知识库详情页找「字段管理」或「文档属性」。**找不到就先跳过**，工作流也能跑（只是元数据过滤失效，纯语义检索）。

### 知识库 2：`jd_blocks`

| 项 | 值 |
|---|---|
| 名称 | `jd_blocks` |
| 描述 | "AI 训练师岗 JD 大段" |
| 数据源 | `data/jd_blocks.json` |
| chunk_size | 1500（每段 JD 约 200-500 字） |

**Metadata**：
| 字段 | 类型 |
|---|---|
| `id` | 字符串 |
| `company` | 字符串 |
| `role_title` | 字符串 |
| `is_trainer` | 布尔 |

### 知识库 3：`structure_samples`

| 项 | 值 |
|---|---|
| 名称 | `structure_samples` |
| 描述 | "简历视觉结构样本" |
| 数据源 | `data/structure_samples.json` |
| chunk_size | 600 |

**Metadata**：
| 字段 | 类型 |
|---|---|
| `id` | 字符串 |
| `layout` | 字符串 |
| `visual_signature` | 字符串 |

> 等待向量化：上传后状态会从「处理中」变「就绪」，10 条数据约 1-3 分钟。

---

## 第 3 步：建工作流

**入口**：左侧栏 → 工作空间 → 资源库 → 右上角 `+ 资源` → 工作流 → 命名 `resume_retrieval`

### 总体结构（拖 5 个节点）

```
[Start] ──→ [LLM: 意图结构化] ──→ [知识库: resume_rules]
                              ──→ [知识库: jd_blocks]
                              ──→ [知识库: structure_samples]
                              ──→ [End: 拼装 JSON 输出]
```

后 3 个知识库节点**并行**（都从 LLM 节点引出）。

### 节点 ① Start

输入参数（在 Start 节点右侧配置面板加）：

| 名称 | 类型 | 必填 |
|---|---|---|
| `student_input` | String | 是 |
| `intake_answers` | String | 是（JSON 字符串，调用方把对象 JSON.stringify 后传） |

### 节点 ② LLM 意图结构化

**模型**：豆包 Pro 32K（够用且免费额度多）
**温度**：0.3
**最大 Tokens**：500
**JSON 模式**：开

**System Prompt**：
```
你是 AI 训练师岗位意图分析师。从学生输入抽取标签。
只输出 JSON 不要任何说明：

{
  "subDirections": ["数组：学生选的细分方向，从 intake_answers.subScenarios 来"],
  "targetRole": "AI 训练师 / 评测",
  "mustHaveSkills": ["数组：从 intake_answers.courseProjects 提取关键能力词"]
}
```

**User Prompt**：
```
学生输入：{{student_input}}
表单回答：{{intake_answers}}
```

### 节点 ③ 知识库节点：检索 resume_rules

| 配置 | 值 |
|---|---|
| 知识库 | 选 `resume_rules` |
| Query | `{{student_input}} {{intake_answers}}` |
| 检索模式 | **混合（hybrid）** |
| Top_K | **3** |
| 相似度阈值 | 0.4 |
| 元数据过滤 | （可选）`task_type` 包含 `{{LLM_1.subDirections}}` 中任一值 |

### 节点 ④ 知识库节点：检索 jd_blocks

| 配置 | 值 |
|---|---|
| 知识库 | `jd_blocks` |
| Query | `{{LLM_1.targetRole}} {{LLM_1.mustHaveSkills}}` |
| 检索模式 | hybrid |
| Top_K | **2** |
| 相似度阈值 | 0.4 |
| 元数据过滤 | `is_trainer = true`（如果支持） |

### 节点 ⑤ 知识库节点：检索 structure_samples

| 配置 | 值 |
|---|---|
| 知识库 | `structure_samples` |
| Query | `{{intake_answers}}` |
| 检索模式 | hybrid |
| Top_K | **1**（只要 1 套） |
| 相似度阈值 | 0（不过滤，让随机性最大） |

> 想要每次随机一套？扣子不直接支持随机采样。POC 阶段可以用 Query 带个时间戳种子（如 `{{intake_answers}} seed-{{$timestamp}}`），让相似度排序稍变化。

### 节点 ⑥ End

返回类型：JSON

**输出 schema**（按 `coze-client.ts` 期待的字段名）：
```json
{
  "intent": "{{LLM_1.output}}",
  "ruleFragments": "{{node_3.documents}}",
  "jdBlocks": "{{node_4.documents}}",
  "structureSample": "{{node_5.documents[0]}}"
}
```

> ⚠️ 字段名必须**完全匹配** `src/lib/coze-client.ts` 里 `RetrievalResult` type 的字段（`ruleFragments` / `jdBlocks` / `structureSample`）。否则 mock 兜底正常但真扣子返回会被解析失败。

---

## 第 4 步：试运行调试

工作流编辑页右上角 **试运行** 按钮：

模拟输入：
```json
{
  "student_input": "想投 AI 训练师，对小红书内容方向感兴趣",
  "intake_answers": "{\"workYears\":\"0\",\"industryCategory\":\"小红书内容\",\"subScenarios\":[\"小红书笔记文案生成\"],\"courseProjects\":[\"RAG 数据质量评估\",\"多模型横评\"],\"modelsTools\":[\"GPT-4\",\"Claude\"]}"
}
```

**期望看到**：
- LLM 节点：返回 intent JSON
- 3 个知识库节点：每个都 ✓ 绿，返回 documents 数组
- End 节点：返回 4 字段对象

**常见报错**：
- "知识库节点无结果" → top_k 太小或相似度阈值太高，先把阈值调到 0 测
- "字段引用错误" → 节点名变了引用没更新
- "JSON 模式输出非 JSON" → System prompt 里强调"只输出 JSON 不要 markdown"

---

## 第 5 步：发布 + 拿 workflow_id

1. 工作流编辑页右上角 **发布** → **发布为 API**
2. 发布后浏览器 URL 形如：
   ```
   https://www.coze.cn/space/<space_id>/workflow/<workflow_id>
   ```
   `workflow_id` 是 URL 里 `workflow/` 后面的 15-20 位数字字符串。

---

## 第 6 步：申请 PAT

1. https://www.coze.cn/open/oauth/pats
2. **添加新令牌**
3. 配置：
   - 名称：`resume-builder-local`
   - **有效期：30 天**（最长）
   - 工作空间：选你刚才搭工作流的空间
   - 权限：勾选 `workflow.run`（必须）+ `knowledge.read`（推荐）
4. 点确认 → **令牌只显示一次**，立即复制

---

## 第 7 步：接入到 Next.js 项目

编辑 `resume-builder/.env.local`（没有就建）：

```bash
COZE_PAT=pat_xxxxxxxxxxxxxxxxxxxxx
COZE_WORKFLOW_ID=7xxxxxxxxxxxxx
COZE_BASE_URL=https://api.coze.cn  # 默认值，可不填
```

重启 dev server：
```bash
pkill -f "next dev"
npm run dev
```

跑一次 generate API（或浏览器走完整流程）。看 server log：
- ✅ 不再有 `[coze-client] 未配置 ... 使用 mock 检索`
- ✅ 应该看到真实 HTTP 调用扣子

如果有 `Coze workflow code=4xxx` 错误：
- 4000：`bot_id` 和 `app_id` 不能同时传（我们没传，应该不会）
- 401：PAT 无效或过期
- 403：权限不够（重申请 PAT 勾全权限）

---

## 附录 A：JSON 数组转分段文本（如果扣子不直接支持）

如果上传 `resume_rules.json` 后扣子把整个文件当成一条文档（而不是每条规则一条），跑这个一次性脚本转换：

```bash
# 在项目根目录跑（不需要加 npm script）
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/resume_rules.json', 'utf-8'));
const text = data.map(r => 
  '【ID】' + r.id + '\n' +
  '【规则维度】' + r.rule_dimension + '\n' +
  '【任务类型】' + r.task_type + '\n' +
  '【风格】' + r.style + '\n' +
  '【方法论】' + r.fragment + '\n' +
  '【来源】' + r.source
).join('\n\n===\n\n');
fs.writeFileSync('data/resume_rules.txt', text);
console.log('生成 data/resume_rules.txt');
"
```

然后上传 `.txt` 文件，分隔符设成 `===`。同样方法处理 `jd_blocks.json` 和 `structure_samples.json`。

---

## 附录 B：扣子限制速查

| 项 | 免费额度 | 我们用量 |
|---|---|---|
| QPS | 2 | 单用户场景，远低于 |
| QPM | 60 | 50 学生 × 5 次/月 = 250 次/月，平均 0.25/分钟 |
| QPD | 3000 | 250 次/月 = 8 次/天，远低于 |
| PAT 有效期 | 30 天 | 到期重申 |
| 单次工作流执行 | 90 秒同步 / 24h 异步 | 我们 5-15 秒，没问题 |

POC 阶段免费额度完全够。

---

## 验收清单（搭完照这个核对）

- [ ] 3 个知识库都建好且状态「就绪」
- [ ] 工作流 5 个节点连接正确（LLM → 3 个知识库并行 → End）
- [ ] 试运行 200，End 节点输出含 `intent` / `ruleFragments` / `jdBlocks` / `structureSample` 4 个字段
- [ ] 发布为 API
- [ ] PAT 已生成并保存
- [ ] `.env.local` 配好 `COZE_PAT` + `COZE_WORKFLOW_ID`
- [ ] 重启 dev server 后调用 `/api/generate`，server log 不再出现 mock 兜底字样
- [ ] 端到端跑出来的简历跟之前 mock 版本对比，看是否更"懂学生方向"（规则维度召回更准）

---

## 哪些信息没 100% 确认（搭的时候自己确认下）

1. **JSON 数组上传是否每项独立分段**：扣子文档没明说，**先试一次**，不行用附录 A
2. **元数据过滤 UI**：不同版本位置不同，找不到就跳过（语义检索仍然能用）
3. **节点变量引用语法**：可能是 `{{节点名.字段}}` 也可能是 `{{$node1.output}}`——以扣子界面给的智能补全为准
4. **每次随机一套结构样本**：扣子不直接支持，POC 阶段先固定取 top 1，等需要时再加随机性

搭完反馈遇到的实际界面跟这份手册哪里不一致，我可以帮你对接。

# 飞书多维表格字段定义清单 + 扣子工作流接入指引

> 给老师的设计文档：按这份清单建飞书多维表格，扣子工作流就能直接读取。
>
> 前端表单产出 → 飞书多维表格（一行一学生）→ 扣子工作流批量消费 → 多模型子 agent 拆字段 → 写回个人优势 + 简历 JSON

## 整体数据流

```
[学生在前端填表 7 题]
    ↓
[POST /api/export-feishu]
    ↓
[飞书多维表格] 一行一学生，含下面 16 个输入字段 + 2 个输出字段
    ↓
[扣子工作流（老师搭）]
   触发：飞书表格新增/修改记录 webhook，或 cron 批量
   流程：意图理解 → 多 agent 拆字段（个人优势 / 项目细节 / 结构布局 / 高亮颜色）→ 汇总融合
   写回：调飞书 OpenAPI 把生成的"个人优势"和"简历 JSON"写回同一行
    ↓
[学生看编辑器 / 下载 PDF]
   读飞书行 → 渲染编辑器 → 学生在编辑器编辑个人优势 → 导出 PDF
```

---

## 飞书多维表格字段（16 输入 + 2 输出）

> 类型对照飞书多维表格的字段类型选择。

### A 段：基本信息（6 字段）

| 飞书字段名 | 飞书类型 | 来自前端的字段 | 示例 | 说明 |
|---|---|---|---|---|
| `学生姓名` | 文本 | `basicInfo.name` | 李雪 | 必填 |
| `手机` | 文本 | `basicInfo.phone` | 13800138000 | 可空 |
| `邮箱` | 文本 | `basicInfo.email` | lixue@example.com | 可空 |
| `毕业院校` | 文本 | `basicInfo.school` | 华南理工大学 | 必填 |
| `专业` | 文本 | `basicInfo.major` | 计算机科学与技术 | 可空 |
| `毕业时间` | 文本 | `basicInfo.graduation` | 2025.06 | 可空，工作流自动推算 period |

### B 段：方向 + 项目（5 字段）

| 飞书字段名 | 飞书类型 | 来自前端的字段 | 选项 / 示例 |
|---|---|---|---|
| `行业大类` | 单选 | `intakeAnswers.industryCategory` | 13 项见 `src/lib/industries.ts`：电商 / 小红书内容 / 短视频内容 / 教育 / 医疗 / 法律 / 金融 / 智能客服 / 多模态 / Agent / Tool / RAG 知识库 / 具身智能 / 其他垂直 |
| `细分场景` | 多选（自定义/AI 生成）| `intakeAnswers.subScenarios` | 1-3 个，AI 实时生成（每个学生场景不同；建议设成"文本"或多选自由值） |
| `课程项目` | 多选 | `intakeAnswers.courseProjects` | 11 项：RAG 数据质量评估 / CoT 推理过程标注 / SFT 数据生产（单轮/多轮）/ RLHF 偏好标注 / Agent ReAct 轨迹标注 / 多模态 T2I 文生图评测 / 多模态 T2V 文生视频评测 / VLM 视觉语言模型评测 / 多模型横评 / Dify SFT 数据自动合成 / 小组评测路演 |
| `路演场景` | 文本 | `intakeAnswers.pathwayScene` | 仅当 courseProjects 含"小组评测路演"时填，如"教育题目评测" |
| `模型工具` | 多选 | `intakeAnswers.modelsTools` | 限选 3-5 个，从 16 项白名单：GPT-4 / Claude / 豆包 / DeepSeek / 千问 / 文心一言 / Gemini / Sora / 可灵 / 海螺 / OpenCompass / SuperCLUE / Dify / 火山引擎 / Label Studio / Coze |

### C 段：偏好（板书新增 3 字段）

| 飞书字段名 | 飞书类型 | 来自前端的字段 | 选项 |
|---|---|---|---|
| `AI 行业年限` | 单选 | `intakeAnswers.aiIndustryYears` | `<6m`（不到半年，应届）/ `6m-1y`（半年-1 年）/ `1-2y`（1-2 年）/ `>2y`（2 年以上） |
| `简历结构偏好` | 单选 | `intakeAnswers.resumeStructure` | `vertical` 上下结构 / `horizontal` 左右两栏 / `card` 项目卡片 |
| `高亮字段` | 多选 | `intakeAnswers.highlightFields` | 8 项白名单：量化结果 / 行业场景 / 技术工具 / 团队角色 / 规则方法论 / 项目周期 / Bad Case 归因 / 评测维度数 |

### D 段：上下文（2 字段）

| 飞书字段名 | 飞书类型 | 来自前端的字段 | 说明 |
|---|---|---|---|
| `学生原始描述` | 文本 | `sourceInput.scenario` | 学生在首页填的一句话描述 |
| `提交时间` | 自动时间戳 | — | 飞书自带 |

### E 段：扣子工作流写回（2 字段）

| 飞书字段名 | 飞书类型 | 谁写 | 说明 |
|---|---|---|---|
| `个人优势` | 文本 | **扣子工作流** | 老师 agent 基于 AI 年限+项目+高亮偏好生成；学生在编辑器二次编辑 |
| `简历 JSON` | 文本 | **扣子工作流** | 完整 Resume JSON（参见 `src/lib/schema/resume.ts` 的 ResumeSchema） |

---

## 飞书多维表格建表参考 SQL（伪代码）

不是真 SQL，飞书多维表格只能 UI 建。但可以照这个 schema 一行一行勾：

```
表名：训练师简历_v3

主键：record_id（飞书自动）

列：
1.  学生姓名         text       NOT NULL
2.  手机            text
3.  邮箱            text
4.  毕业院校         text       NOT NULL
5.  专业            text
6.  毕业时间         text
7.  行业大类         single_select  options=[13 项见上]
8.  细分场景         text                       (AI 生成的，存逗号分隔字符串简单处理)
9.  课程项目         multi_select   options=[11 项]
10. 路演场景         text
11. 模型工具         multi_select   options=[16 项]
12. AI 行业年限      single_select  options=[<6m, 6m-1y, 1-2y, >2y]
13. 简历结构偏好     single_select  options=[vertical, horizontal, card]
14. 高亮字段         multi_select   options=[8 项]
15. 学生原始描述     text
16. 提交时间         created_at     auto
17. 个人优势         text                       (扣子工作流写回)
18. 简历 JSON        text                       (扣子工作流写回，可能要 long_text)
```

---

## 扣子工作流接入示例

### 触发方式（二选一）

**A. webhook 触发（实时）**
飞书多维表格"自动化"功能 → 新增/修改记录 → 调扣子工作流的 HTTP API：
```
POST https://api.coze.cn/v1/workflow/run
Authorization: Bearer <pat>
{
  "workflow_id": "<老师建的工作流 id>",
  "parameters": {
    "record_id": "<新增行的 record_id>",
    "fields": "<新增行的所有字段 JSON>"
  }
}
```

**B. 批量定时触发（适合积累一批后跑）**
扣子定时任务 → 拉飞书表格全量记录 → 过滤"简历 JSON 字段为空"的 → 逐行跑工作流。

### 扣子工作流节点设计（建议）

```
[Start: 接收 record_id + fields]
    ↓
[1. 字段解析 LLM 节点（豆包 32K，简单 JSON parse）]
    输入：fields（飞书行的整体 JSON）
    输出：意图标签 { aiYears, industry, projects, models, structure, highlights }
    ↓
┌── [2a. 个人优势 agent（Claude）]      ──┐
│    输入：aiYears + projects + models   │
│    输出：personalStrengths 文本（150 字） │
├── [2b. 项目细节 agent（Claude）]       ──┤
│    输入：projects + industry + scenarios│
│    输出：experiences 数组（4-6 项）       │
├── [2c. 结构布局 agent（豆包）]         ──┤
│    输入：structure + highlights         │
│    输出：visualStructure JSON           │
└── [2d. 高亮颜色 agent（豆包，性别推断）]──┘
     输入：name + highlights
     输出：高亮颜色配置
    ↓
[3. 汇总融合 LLM 节点（Claude）]
    输入：上面 4 个 agent 的输出 + 飞书行的 basic 信息
    输出：完整 Resume JSON（符合 ResumeSchema）
    ↓
[4. 写回飞书表格（HTTP 节点）]
    PATCH /open-apis/bitable/v1/apps/<token>/tables/<id>/records/<record_id>
    body: { fields: { 个人优势, 简历 JSON } }
    ↓
[End]
```

### 关键提示词约束（沿用 V2 防幻觉硬约束）

每个 agent 的 system prompt 都要带：

```
1. 不写数据量绝对值（用"数千条"、"全量"模糊量化）
2. 不写项目周期 / 不写算法岗指标（FID / 推理速度）
3. 量化只用学生提供 + 训练师维度（维度数 / 模型对比数 / 场景覆盖数 / Bad Case 类别数）
4. 禁止编造具体数字：Kappa / 一致性系数 / 上手时间 / X 类场景 / N% 准确率
5. 禁止用学生未勾选的方法论术语
6. 应届无管理动作；3 年+ 才明确管理者视角
```

完整版见 `src/lib/prompts/generate-resume.ts` 里的硬约束 A-E 五条，可以直接抄到扣子的 LLM 节点 system prompt。

---

## 字段命名一致性检查（前端 / 飞书 / 扣子）

| 来源 | 字段路径 | 飞书列名 | 扣子工作流变量 |
|---|---|---|---|
| 前端 | `basicInfo.name` | 学生姓名 | `{{fields.学生姓名}}` |
| 前端 | `intakeAnswers.aiIndustryYears` | AI 行业年限 | `{{fields.AI 行业年限}}` |
| 前端 | `intakeAnswers.industryCategory` | 行业大类 | `{{fields.行业大类}}` |
| 前端 | `intakeAnswers.subScenarios` | 细分场景 | `{{fields.细分场景}}` |
| 前端 | `intakeAnswers.courseProjects` | 课程项目 | `{{fields.课程项目}}` |
| 前端 | `intakeAnswers.modelsTools` | 模型工具 | `{{fields.模型工具}}` |
| 前端 | `intakeAnswers.resumeStructure` | 简历结构偏好 | `{{fields.简历结构偏好}}` |
| 前端 | `intakeAnswers.highlightFields` | 高亮字段 | `{{fields.高亮字段}}` |
| 后端写回 | — | 个人优势 | 扣子写 |
| 后端写回 | — | 简历 JSON | 扣子写 |

---

## 老师下一步

1. **建飞书多维表格**：按上面 16+2 列建好；记下 `app_token` 和 `table_id`
2. **告诉用户**：把 `app_token` + `table_id` 给前端，前端加到 `.env.local`
3. **建扣子工作流**：按上面节点设计搭，用飞书 webhook 触发
4. **试运行**：让用户先填一份表单 → 看飞书新增一行 → 看扣子工作流是否跑通 → 看回写的"个人优势"和"简历 JSON" 是否合理

# AI 训练师简历信息收集表

专为 **AI 训练师 / 数据标注员 / 模型评测员** 设计的简历信息收集工具。

学生在线填写模型方向、项目经历、行业背景，提交后数据实时写入飞书多维表格，老师或招聘方可直接查阅汇总。

---

## 表单结构

| 题目 | 说明 |
|------|------|
| 基本信息 | 姓名、手机（必填，用于去重）、邮箱、院校、专业、毕业时间 |
| 模型方向 | 多模态 / 文本模型 / 混合 / 通用美学（大厂通用实习线） |
| 做过的项目 | 三组：文本标注（SFT/CoT/RAG/ASR）、模型评测（LLM/横评/音频）、多模态（T2I/T2V/VQA/Caption 等） |
| 想要做的 AI 方向 | 14 个行业大类 + 二级专业标签多选，支持自定义填写 |
| AI 年限 | 1年 / 2年 / 自定义（覆盖实习、兼职、3年+ 等各种情况） |

---

## 防刷保护

- IP 频率限制：每 IP 每分钟最多 5 次提交
- 手机号去重：同一手机号最多提交 3 次（前端计数 + 后端飞书查重双重校验）
- Honeypot 隐藏字段：过滤机器人自动提交
- 字段格式校验：姓名/手机/邮箱/毕业时间均有格式要求

---

## 技术栈

- **框架：** Next.js 16 (App Router) + TypeScript
- **UI：** Tailwind CSS
- **状态：** Zustand
- **数据校验：** Zod
- **数据存储：** 飞书多维表格 OpenAPI（fetch 直连）
- **部署：** Vercel

---

## 本地运行

```bash
git clone https://github.com/LoikStyle/resume-builder.git
cd resume-builder
npm install
cp .env.example .env.local   # 填入飞书凭证
npm run dev
```

打开 http://localhost:3000

---

## 环境变量

```bash
cp .env.example .env.local
```

| 变量 | 说明 |
|------|------|
| `FEISHU_APP_ID` | 飞书自建应用 App ID |
| `FEISHU_APP_SECRET` | 飞书自建应用 App Secret |
| `FEISHU_BITABLE_APP_TOKEN` | 多维表格 App Token |
| `FEISHU_BITABLE_TABLE_ID` | 目标数据表 Table ID |
| `SESSION_SECRET` | Session 签名密钥（随机字符串，≥16 字节） |
| `ADMIN_TOKEN` | 管理后台访问 Token |
| `NEXT_PUBLIC_BASE_PATH` | 子路径部署时填（如 `/resume`），根路径留空 |

飞书自建应用申请：https://open.feishu.cn/app

---

## 飞书表格字段

提交后写入以下列：

| 列名 | 类型 | 说明 |
|------|------|------|
| 学生姓名 | 文本 | |
| 手机 | 文本 | 必填，用于去重 |
| 邮箱 | 文本 | 可选 |
| 毕业院校 | 文本 | |
| 专业 | 文本 | |
| 毕业时间 | 文本 | |
| 模型方向 | 文本 | 多模态 / 文本模型 / 混合 / 通用美学 |
| 项目类别 | 文本 | JSON 数组，如 `["文本标注","多模态"]` |
| 做过的项目 | 文本 | JSON 数组，具体任务名称 |
| 想要做的 AI 方向 | 文本 | 行业大类或自定义方向 |
| 专业方向 | 文本 | JSON 数组，行业二级标签 |
| AI 行业年限 | 文本 | `1y` / `2y` 或自定义文本 |

---

## 项目结构

```
src/
├── app/
│   ├── intake/              # 学生填写入口
│   ├── admin/               # 管理后台（Prompt 调试）
│   └── api/
│       ├── export-feishu/   # 表单提交 → 写飞书
│       └── subscenarios/    # AI 生成细分场景（可选）
├── components/intake/
│   ├── IntakeForm.tsx       # 主表单组件
│   └── questions.ts         # 选项配置（题目数据）
└── lib/
    ├── feishu-client.ts     # 飞书 API 封装
    ├── industries.ts        # 行业 + 二级标签数据
    ├── validators.ts        # 字段校验规则
    ├── rate-limit.ts        # IP 频率限制
    └── schema/resume.ts     # TypeScript 类型定义
```

---

## 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/LoikStyle/resume-builder)

在 Vercel 控制台的 Environment Variables 填入上述变量即可。

---

## License

MIT

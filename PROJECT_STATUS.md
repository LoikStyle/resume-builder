# AI 训练师简历生成器 — 项目现状文档

> 最后更新：2026-05-04
> 用途：下个对话框继续开发时的上下文参考

---

## 一、项目概览

**产品定位**：面向 AI 训练师 / 评测方向求职学生的简历内容生成平台。
学生填 5 道问卷 + 基本信息 → 后端 AI 工作流生成简历内容片段 → 数据写入飞书多维表格供老师批阅。

**技术栈**：Next.js 16.2.4（App Router，Turbopack）、TypeScript、Zustand、Tailwind CSS
**本地运行**：`npm run dev` → `http://localhost:3000/resume/intake`（注意有 basePath `/resume`）
**线上地址**：`https://43.156.46.230:9090/resume/intake`（Tencent Cloud 新加坡，nginx 443 → pm2 3000）

---

## 二、本地项目结构

```
resume-builder/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── subscenarios/route.ts   ← 细分场景生成（V3.6 prompt）
│   │   │   ├── export-feishu/route.ts  ← 表单数据 → 飞书多维表格
│   │   │   ├── generate/route.ts       ← 完整简历生成（V2 demo 链路）
│   │   │   └── export-pdf/route.ts
│   │   ├── intake/page.tsx             ← 问卷表单入口
│   │   └── editor/page.tsx             ← 简历编辑器
│   ├── components/
│   │   └── intake/
│   │       ├── IntakeForm.tsx          ← 主表单（5 道题 + 基本信息 + 双提交按钮）
│   │       ├── SubscenarioPicker.tsx   ← 细分场景 picker（按钮触发）
│   │       └── questions.ts            ← 选项数据（行业/项目/结构偏好等）
│   ├── lib/
│   │   ├── claude-client.ts            ← Claude CLI spawn 封装（非 --bare 模式）
│   │   └── feishu-client.ts            ← 飞书多维表格写入（lark-cli 直连）
│   └── store/resume-store.ts
├── next.config.ts                      ← basePath: '/resume'
├── .env.local                          ← 本地凭证（不上传 git）
├── deploy.sh                           ← 一键部署脚本
└── PROJECT_STATUS.md                   ← 本文件
```

---

## 三、已完成功能（V3.x 迭代记录）

### V3.4 — 细分场景按钮触发
- 从"自动触发"改为"显式按钮触发"，解决 React Strict Mode 双调用 + abort race 导致的顽固 bug
- `SubscenarioPicker.tsx`：新增 `triggerNonce` prop，nonce > 0 才发请求，idle 时显示提示文案
- `IntakeForm.tsx`：新增 `subTriggerNonce` state，「生成细分场景」按钮 onClick +1；切换行业/项目时自动归零

### V3.5 → V3.6 — 细分场景 Prompt 质量提升
- V3.5：8 个跨行业案例（替换之前 20 个电商/人像案例）
- **V3.6（当前）**：用用户提供的 46 个真实 AI 训练师简历案例中精选 12 个作为范本
  - 按任务类型分 3 组：评测类 4 个 / 训练类 4 个 / 标注类 4 个
  - 强制 name 含技术方法（T2I/SFT/VQA/Caption）；description 必须精确动词；core_dimensions 含领域指标（GSB盲测/Kappa系数/直出可用率/ELO评分等）
  - 实测：电商 vs 教育场景完全不同，医疗/法律等行业可泛化

### 飞书多维表格写入（V3.x）
- **架构**：Next.js API → spawn 本地 `lark-cli` → Feishu Bitable API（直连，不走服务器中转）
- **Bitable 信息**：Base Token `QS4Hb5p46aAO00stbsRcLNuGnQg` / Table ID `tblqcR6ych4MH9at`
- **URL**：`https://my.feishu.cn/base/QS4Hb5p46aAO00stbsRcLNuGnQg`
- **14 个字段**：学生姓名、手机、邮箱、毕业院校、专业、毕业时间、课程项目、路演场景、行业大类、AI 行业年限、细分场景、高亮字段、简历结构偏好、学生原始描述
- **fallback**：lark-cli 失败时走腾讯云服务器 relay（Python HTTP server + lark-cli）

### V3.7 — 云部署
- 服务器：腾讯云新加坡 `43.156.46.230`，SSH 端口 2222，密钥 `~/Downloads/macos.pem`
- pm2 id=1 `resume-builder`，工作目录 `/root/resume-builder`，端口 3000
- nginx 9090（HTTPS）→ `/resume/` → `proxy_pass http://127.0.0.1:3000/resume/`
- 部署命令：`./deploy.sh`（自动排除 `.env.local`，防止覆盖服务器凭证）

---

## 四、关键配置文件

### 本地 `.env.local`
```
LARK_CLI_PATH=/Users/believe/.petclaw/node/bin/lark-cli
FEISHU_BITABLE_APP_TOKEN=QS4Hb5p46aAO00stbsRcLNuGnQg
FEISHU_BITABLE_TABLE_ID=tblqcR6ych4MH9at
FEISHU_BITABLE_PUSH_URL=https://43.156.46.230:9090/bitable-relay/
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 服务器 `/root/resume-builder/.env.local`
```
NEXT_PUBLIC_BASE_PATH=/resume
LARK_CLI_PATH=/root/.nvm/versions/node/v22.22.0/bin/lark-cli
FEISHU_BITABLE_APP_TOKEN=QS4Hb5p46aAO00stbsRcLNuGnQg
FEISHU_BITABLE_TABLE_ID=tblqcR6ych4MH9at
FEISHU_BITABLE_PUSH_URL=https://43.156.46.230:9090/bitable-relay/
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### `next.config.ts`
```typescript
const nextConfig: NextConfig = {
  basePath: '/resume',
  async headers() { /* 允许飞书 iframe 嵌入 */ }
};
```

---

## 五、已知问题 & 坑点

| 问题 | 原因 | 解决方式 |
|---|---|---|
| 细分场景生成失败 HTTP 404 | `NEXT_PUBLIC_BASE_PATH` 未写入服务器 `.env.local` 就构建 | `deploy.sh` 排除 `.env.local`；服务器单独维护 |
| Claude CLI exit 1 (hook 报错) | claude-mem 插件 SessionEnd hook 失败 | `claude-client.ts`：exit 1 + stdout 非空 + stderr 含 "hook" 时仍解析输出 |
| Claude CLI "Not logged in" | `--bare` 模式跳过 OAuth，只认 API key | 去掉 `--bare` 改用普通模式（OAuth 可用） |
| 飞书自建应用 91403 Forbidden | 飞书自建应用不支持 Bitable API，只有机器人能用 | 改用 lark-cli 直连（本地 Mac / 服务器均有） |
| nginx /api/ 404 | `/api/` 已有其他服务（port 8001），客户端裸 fetch 走错 | 用 `NEXT_PUBLIC_BASE_PATH` 让 fetch URL 变成 `/resume/api/...` |
| rsync 覆盖服务器 .env.local | deploy.sh 最初没排除 .env.local | 已在 deploy.sh 加 `--exclude '.env.local'` |

---

## 六、表单问卷结构（V3.1）

```
基本信息：姓名*、毕业院校*、手机、邮箱、专业、毕业时间

Q1. 做过的项目（多选）
  → SFT 单/多轮对话标注 / CoT 推理 / RLHF / DPO / RAG / Agent
  → 多模态 T2I/T2V/VLM/VQA/Caption / TTS/ASR / 数字人
  → 角色扮演 / 视频生成 / 世界模型 / 多模型横评 / Dify 合成
  → 勾选「小组评测路演」时出现补充文本框（路演场景）

Q2. 行业场景大类（单选）
  → 电商/教育/医疗/法律/金融/游戏/短剧/智能客服/...

Q2b. 细分场景（AI 生成，多选 1-3 个）
  → 点「生成细分场景」按钮 → Claude haiku 4.5 生成 6-14 个场景

Q3. AI 行业年限（单选）：<6m / 6m-1y / 1-2y / 2y+

Q4. 高亮定制（多选）：技术栈 / 数据规模 / 业务背景 / 工具效率...

Q5. 简历结构偏好（单选，6 种）
```

---

## 七、双提交路径

### 主路径：提交到飞书多维表格
```
IntakeForm → POST /resume/api/export-feishu
  → feishu-client.ts:pushLocalCli()
  → spawn lark-cli api POST /open-apis/bitable/v1/...
  → 返回 {mode: "feishu-local-cli", record_id: "..."}
  → 飞书表格出现新行
```

### Demo 路径：本地 Claude 生成简历
```
IntakeForm → POST /resume/api/generate
  → claude-client.ts:callClaude()
  → spawn claude --print --model claude-sonnet-4-6 --output-format json
  → 返回完整简历 JSON
  → Zustand store → 跳转 /resume/editor
```

---

## 八、服务器完整状态（43.156.46.230）

### SSH 连接
```bash
ssh -p 2222 -i ~/Downloads/macos.pem root@43.156.46.230
# 或（如果 ~/.ssh/config 有配 Host cloud）
ssh cloud
```

### pm2 进程列表

| id | 名称 | 端口 | 目录 | 说明 |
|---|---|---|---|---|
| 0 | `roi-tool` | 3050 | `/root/roi-tool` | Next.js 16.2.1，ROI 计算工具 |
| 1 | `resume-builder` | 3000 | `/root/resume-builder` | **本项目** Next.js 16.2.4 |
| 2 | `resume-cf` | — | — | Cloudflared 隧道（127.0.0.1:20242） |

```bash
# pm2 常用命令（需先 export PATH）
export PATH=/root/.nvm/versions/node/v22.22.0/bin:$PATH
pm2 list
pm2 logs resume-builder --lines 50
pm2 reload resume-builder --update-env
```

### Nginx 配置概览

**端口 9090** — `code-server.conf`（主要公网入口）

| 路径 | 目标 | 说明 |
|---|---|---|
| `/resume/` | `http://127.0.0.1:3000/resume/` | **本项目**，超时 360s |
| `/api/` | `http://127.0.0.1:8001` | Python3 API 服务 |
| `/qdrant/` | `http://127.0.0.1:6333` | Qdrant 向量数据库 |
| `/bitable-relay/` | `http://127.0.0.1:19091` | 飞书 Bitable relay（Python HTTP server） |
| `/vm/` | `/var/www/vm/` | 静态文件 |
| `/` | `http://127.0.0.1:18080` | code-server IDE |

**端口 8081** — `portfolio.conf`
- `/` → `/var/www/portfolio`（静态个人作品集网站）
- `/videos/` → `/var/www/videos/`（视频资源）

**端口 8082** — `shanhe.conf`
- `/` → `/var/www/shanhe`（SPA 网站，try_files 模式）

### 其他后台服务

| 端口 | 进程 | 说明 |
|---|---|---|
| 8001 | Python3 | API 服务（不明具体功能） |
| 19091 | Python3 | Bitable relay HTTP server |
| 19090 | Python3 | 另一个 Python 服务 |
| 6333 | Docker | Qdrant 向量数据库 |
| 80/443/8080/8085/8443 | Docker | 多个 Docker 容器服务 |
| 5003 | Docker | Docker 容器 |
| 20241/20242 | cloudflared | 内网穿透隧道 |
| 15288 | — | openclaw-gateway |
| 37777 | bun | claude-mem MCP server |

### 服务器上的项目目录 (`/root/`)

| 目录 | 说明 |
|---|---|
| `resume-builder/` | **本项目**（pm2 id=1） |
| `roi-tool/` | ROI 计算工具（pm2 id=0） |
| `portfolio/` | 个人作品集（静态，nginx 8081） |
| `dify/` | Dify 自部署（Docker） |
| `gbrain/` | — |
| `my-app/` | — |
| `wx-publisher/` | 微信公众号发布工具 |
| `xiaohongshu/` | 小红书相关 |
| `article-tools/` | 文章工具 |
| `Hermes-Wiki/` | Wiki 系统 |
| `personal-website/` | 个人网站 |
| `label-studio-data/` | 标注数据 |
| `skills/` | — |

### 认证状态

| 工具 | 状态 | 账号/备注 |
|---|---|---|
| **lark-cli** | ✅ 已认证 | App: `cli_a94d4c557cb89bd6`，⚠️ Token 过期时间：`2026-05-04T19:23:46+08:00`（当天！需要续期） |
| **Claude CLI** | ✅ 已登录 | authMethod: claude.ai，email: xiaoxie687@gmail.com |
| Node.js | nvm v22.22.0 | PATH 需显式 export |

> ⚠️ **lark-cli token 当天过期**：下次写入飞书前需在服务器上重新运行 `lark-cli auth login`

---

## 九、服务器运维速查

```bash
# SSH 连接
ssh -p 2222 -i ~/Downloads/macos.pem root@43.156.46.230
# 或（如果 ~/.ssh/config 有配 Host cloud）
ssh cloud

# pm2 常用命令（需先 export PATH）
export PATH=/root/.nvm/versions/node/v22.22.0/bin:$PATH
pm2 list                          # 查看进程状态
pm2 logs resume-builder --lines 50 # 查日志
pm2 reload resume-builder --update-env  # 热重载

# 一键部署（本地 Mac 跑）
cd ~/Desktop/网站claude/resume-builder
./deploy.sh

# nginx 配置
cat /etc/nginx/conf.d/code-server.conf
nginx -t && nginx -s reload

# lark-cli token 续期（在服务器上跑）
export PATH=/root/.nvm/versions/node/v22.22.0/bin:$PATH
lark-cli auth login

# 测试细分场景 API
curl -sk -X POST https://43.156.46.230:9090/resume/api/subscenarios \
  -H "Content-Type: application/json" \
  -d '{"category":"电商","courseProjects":["VQA 视觉问答标注","多模型横评"]}'

# 测试飞书写入
curl -sk -X POST https://43.156.46.230:9090/resume/api/export-feishu \
  -H "Content-Type: application/json" \
  -d '{"scenario":"test","intakeAnswers":{"courseProjects":["SFT 单轮对话标注"],"industryCategory":"电商","subScenarios":[],"aiIndustryYears":"<6m","highlightFields":[],"resumeStructure":"blue-fresh"},"basicInfo":{"name":"测试","school":"XX大学","phone":"","email":"","major":"","graduation":""}}'
```

---

## 十、待办 & 后续方向

- [ ] **lark-cli token 续期**：服务器上 token `2026-05-04T19:23:46+08:00` 过期，需 SSH 上去 `lark-cli auth login` 重新认证
- [ ] **V3.3 飞书工作台嵌入**：把 Next.js 部署后在飞书开放平台创建应用，配置主页 URL，嵌入工作台
- [ ] **Anthropic API Key 替代 Claude CLI**：上云后 Claude CLI 依赖 OAuth session，考虑迁移到 `@anthropic-ai/sdk` + API Key，更稳定
- [ ] **细分场景质量持续优化**：收集更多行业案例（当前主要覆盖电商/教育/医疗），补充金融/游戏/法律
- [ ] **简历模板**：目前只生成内容片段，可接入模板渲染（PDF 导出现有 `/api/export-pdf` 路由）
- [ ] **学生填写进度保存**：表单刷新后数据丢失，可加 localStorage 持久化

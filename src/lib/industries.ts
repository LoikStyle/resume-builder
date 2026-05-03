/**
 * 行业场景大类（V2）
 * 学生选 1 个 → AI 实时生成该大类下的 12-15 个细分场景
 *
 * 这份草稿由产品方维护，请直接编辑此文件增删条目。
 * 每条只需 name + description（一句话），代码不依赖 description。
 */

export type IndustryCategory = {
  name: string;
  description: string;
};

export const INDUSTRIES: IndustryCategory[] = [
  // 内容 / 营销
  { name: '电商', description: '商品图 / 直播 / 文案 / 推荐 / 客服等场景' },
  { name: '小红书内容', description: '美妆 / 旅行 / 数码 / 穿搭 / 美食等垂类种草' },
  { name: '短视频内容', description: '短剧 / 配音 / 剪辑 / 文生视频 / 题材库' },
  { name: '影视化创作', description: '剧本生成 / 镜头脚本 / 演员分配 / 后期评测' },
  { name: '内容创作 / 文案', description: '公众号 / 知乎 / 头条等长文写作 / 营销文案' },
  { name: '营销 / 投放', description: '广告创意 / 投放策略 / 用户画像 / 转化漏斗' },
  // 行业垂直
  { name: '教育', description: '题目生成 / 解题评估 / 教学评测 / 个性化辅导' },
  { name: '医疗', description: '病例标注 / 影像 / 医嘱 / 知识库（专业向）' },
  { name: '法律', description: '合同审查 / 案例检索 / 合规标注（专业向）' },
  { name: '金融', description: '风控 / 投研 / 财报 / 智能投顾 / 客服' },
  { name: '文旅', description: '景区导览 / 攻略生成 / 旅游种草 / 文创内容' },
  // 对话 / 角色
  { name: '智能客服', description: '对话评测 / Bad Case 拦截 / 拒答策略 / 多轮对话' },
  { name: '角色扮演 / 虚拟陪伴', description: '人格设定 / 长期记忆 / 情感对话 / 安全边界' },
  { name: '数字人 / 配音', description: '形象生成 / TTS / 唇形对齐 / 直播替身' },
  // 多模态 / 技术向
  { name: '多模态', description: '文生图 / 文生视频 / VQA / ASR / TTS 数据生产与评测' },
  { name: 'Agent / Tool', description: 'ReAct 轨迹标注 / Tool 调用质量 / 任务分解评估' },
  { name: 'RAG 知识库', description: '问答质量评估 / Chunk 切分 / Rerank 优化' },
  { name: '具身智能 / 世界模型', description: '物理推理 / 空间理解 / 3D 生成 / 机器人' },
  // 工程向
  { name: '编程 / 代码助手', description: '代码生成 / 代码审查 / 单元测试评测' },
  { name: '翻译 / 多语言', description: '机器翻译 / 同传 / 跨文化对齐评测' },
  { name: '游戏 / 互动剧本', description: 'NPC 对话 / 剧情分支 / 任务设计' },
  // 兜底
  { name: '其他垂直', description: '不在以上列表里的垂直场景，由学生自由描述' },
];

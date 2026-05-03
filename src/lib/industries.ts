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
  { name: '电商', description: '商品图 / 直播 / 文案 / 推荐 / 客服等场景' },
  { name: '小红书内容', description: '美妆 / 旅行 / 数码 / 穿搭 / 美食等垂类种草' },
  { name: '短视频内容', description: '短剧 / 配音 / 剪辑 / 文生视频 / 题材库' },
  { name: '教育', description: '题目生成 / 解题评估 / 教学评测 / 个性化辅导' },
  { name: '医疗', description: '病例标注 / 影像 / 医嘱 / 知识库（专业向）' },
  { name: '法律', description: '合同审查 / 案例检索 / 合规标注（专业向）' },
  { name: '金融', description: '风控 / 投研 / 财报 / 智能投顾 / 客服' },
  { name: '智能客服', description: '对话评测 / Bad Case 拦截 / 拒答策略 / 多轮对话' },
  { name: '多模态', description: '文生图 / 文生视频 / VQA / ASR / TTS 数据生产与评测' },
  { name: 'Agent / Tool', description: 'ReAct 轨迹标注 / Tool 调用质量 / 任务分解评估' },
  { name: 'RAG 知识库', description: 'Q-R-R 三元评估 / Chunk 切分 / Rerank 优化' },
  { name: '具身智能', description: '世界模型 / 物理推理 / 空间理解 / 3D 生成' },
  { name: '其他垂直', description: '不在以上列表里的垂直场景，由学生自由描述' },
];

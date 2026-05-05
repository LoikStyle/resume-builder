/**
 * 16 项行业（SuperCLUE 基准体系，按用户定制调整）
 * 通用能力 3 项 + 垂直行业 12 项 + 通用美学 1 项
 */

export type IndustryCategory = {
  name: string;
  description: string;
  subtags: string[];
  group: '通用' | '垂直行业';
};

export const INDUSTRIES: IndustryCategory[] = [
  // ===== 通用能力 =====
  {
    name: '通用大模型',
    description: '对话质量评测 / SFT标注 / RLHF偏好标注 / CoT推理标注',
    subtags: [],
    group: '通用',
  },
  {
    name: '代码/开发工具',
    description: '代码生成评测 / 代码审查标注 / Bug修复标注 / 技术文档生成',
    subtags: [],
    group: '通用',
  },
  {
    name: '安全',
    description: '有害内容识别 / 内容合规审核 / 对抗样本标注',
    subtags: [],
    group: '通用',
  },

  // ===== 垂直行业 =====
  {
    name: '医疗健康',
    description: '临床问答 / 医学影像描述 / 药物知识 / 大健康养生',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '法律',
    description: '法律知识问答 / 合同文书处理 / 司法案例分析',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '政务',
    description: '政务服务 / 政策文本解析 / 合规评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '金融',
    description: '金融业务知识 / 风险合规 / 投资理财',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '保险',
    description: '保险产品 / 风险合规 / 客服对话',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '教育',
    description: '学科辅导 / 题目生成与标注 / 作文批改 / 学习规划',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '电商',
    description: '商品描述 / 客服对话 / 商品评论分析',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '营销',
    description: '营销文案 / 直播话术 / 社媒文案',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '智能驾驶',
    description: '智能座舱交互 / 车辆使用指南 / 驾驶知识',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '角色扮演',
    description: 'NPC对话设计 / 剧情创作 / 角色扮演评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '内容',
    description: '新闻资讯 / 短视频脚本 / 创意写作',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '媒体',
    description: '社媒文案 / 内容审核 / 短视频脚本',
    subtags: [],
    group: '垂直行业',
  },

  // ===== 通用美学 =====
  {
    name: '通用美学',
    description: '人像质量 / 场景美学 / 光影构图 / 风格一致性 / 材质真实感',
    subtags: [],
    group: '通用',
  },
];

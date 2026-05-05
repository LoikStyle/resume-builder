/**
 * 11 项行业（BOSS直聘 AI 训练师岗位分布）
 * 1 个大模型通用 + 9 个垂直行业 + 1 个通用美学
 *
 * 无二级标签（subtags 全为空数组），只做一级行业单选。
 */

export type IndustryCategory = {
  name: string;
  description: string;
  subtags: string[];
  group: '通用' | '垂直行业';
};

export const INDUSTRIES: IndustryCategory[] = [
  // ===== 通用 =====
  {
    name: '大模型/通用AI',
    description: '不限垂类，通用大模型训练、对话质量评测',
    subtags: [],
    group: '通用',
  },

  // ===== 垂直行业 =====
  {
    name: '自动驾驶/智能汽车',
    description: '驾驶场景感知、行为数据标注与模型评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '医疗健康',
    description: '医学文本/影像标注、药品信息、临床数据评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '金融/保险',
    description: '金融文本标注、风控数据、智能客服评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '教育/培训',
    description: '教学内容评测、知识问答标注、学情分析',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '电商/零售',
    description: '商品描述标注、用户评论分析、推荐系统评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '工业/制造',
    description: '工业视觉检测、设备文本标注、质检数据评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '游戏/娱乐',
    description: '角色对话标注、剧情文本评测、游戏 AI 评测',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '内容/媒体',
    description: '新闻/短视频内容评测、创作质量标注',
    subtags: [],
    group: '垂直行业',
  },
  {
    name: '法律/政务',
    description: '法律文书标注、政策文本解析、合规评测',
    subtags: [],
    group: '垂直行业',
  },

  // ===== 通用美学 =====
  {
    name: '通用美学',
    description: '不限垂类的图像/视频生成质量评估（通用美学训练）',
    subtags: [],
    group: '通用',
  },
];

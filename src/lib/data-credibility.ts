import type { IntakeAnswers, AIIndustryYears } from '@/lib/schema/resume';

type ProjectCategory = 'multimodal-label' | 'multimodal-desc' | 'agent' | 'text-default';

const CATEGORY_RULES: Array<{ keywords: string[]; category: ProjectCategory }> = [
  { keywords: ['T2I', 'T2V', 'VQA', 'Caption', 'VLM', '文生图', '文生视频', '视觉问答', '图文描述', '视觉语言'], category: 'multimodal-label' },
  { keywords: ['TTS', 'ASR', '数字人', '语音合成', '语音识别', '配音'], category: 'multimodal-desc' },
  { keywords: ['Agent', 'ReAct', 'Tool调用', 'Tool 调用', 'agent'], category: 'agent' },
];

// 基准月产量 [min, max]（±25% 前）
const BASE_MONTHLY: Record<ProjectCategory, [number, number]> = {
  'multimodal-label': [3000, 5000],
  'multimodal-desc': [750, 1250],
  'agent': [750, 1250],
  'text-default': [1125, 1875],
};

const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  'multimodal-label': '多模态标签类（T2I/T2V/VQA/Caption/VLM）',
  'multimodal-desc': '多模态描述类（TTS/ASR/数字人）',
  'agent': 'Agent 类（ReAct/Tool 调用）',
  'text-default': '文本/SFT 类（SFT/CoT/RLHF/DPO/RAG/横评等）',
};

const YEARS_LABEL: Record<AIIndustryYears, string> = {
  '1y': '1年，独立模块',
  '2y': '2年，主导规则 + 跨职能',
};

function detectCategory(projectName: string): ProjectCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => projectName.includes(kw))) {
      return rule.category;
    }
  }
  return 'text-default';
}

function applyFluctuation([min, max]: [number, number]): [number, number] {
  return [Math.round(min * 0.75), Math.round(max * 1.25)];
}

export function buildDataRangeSection(answers: IntakeAnswers): string {
  const years = answers.aiIndustryYears;
  const isManagement = years === '2y';
  const projects = [...new Set(answers.courseProjects)];

  // 按类别归组
  const grouped = new Map<ProjectCategory, string[]>();
  for (const p of projects) {
    const cat = detectCategory(p);
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(p);
  }

  const lines: string[] = [];

  // 执行岗：个人数据
  lines.push(`执行岗 · 个人数据（AI年限：${YEARS_LABEL[years]}）`);
  lines.push('每个项目默认 2-4 个月，不同项目取不同随机整数');
  lines.push('');

  for (const [cat, catProjects] of grouped) {
    const [rMin, rMax] = applyFluctuation(BASE_MONTHLY[cat]);
    const totalMin = rMin * 2;
    const totalMax = rMax * 4;
    lines.push(
      `- ${CATEGORY_LABEL[cat]}（${catProjects.join('、')}）：${rMin.toLocaleString()}-${rMax.toLocaleString()} 条/月 → 单项目累计约 ${fmt(totalMin)}-${fmt(totalMax)}`
    );
  }

  if (isManagement) {
    lines.push('');
    lines.push('管理岗附加：若项目中担任过负责人/带队角色，团队数据 = 个人数据 × 团队人数（3-5 人），可写"团队累计处理 X 万条"');
  }

  lines.push('');
  lines.push('规则：');
  lines.push('1. results 里必须写具体整数（如"累计处理 1.2 万条"、"输出 3800 条标注"），禁止写"数千条"、"万级别"等模糊词');
  lines.push('2. 每个 experience 取不同随机值，体现项目差异');
  lines.push('3. 只有执行岗个人数据时写个人数字；如有管理角色再叠加团队数');
  lines.push('4. 若项目类型不在上述范围内，参考文本/SFT类默认值');

  return `【数据量范围约束】在以下范围内取整数值写入 results 字段\n\n${lines.join('\n')}`;
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 万`;
  return `${n.toLocaleString()} 条`;
}

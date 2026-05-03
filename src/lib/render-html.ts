import type { Resume, Experience, TemplateKind } from '@/lib/schema/resume';

/* HTML escape */
const esc = (s: string | undefined | null) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const expTypeLabels: Record<Experience['type'], string> = {
  internship: '实习经历',
  training_project: '项目经历',
  campus: '校园经历',
  competition: '竞赛经历',
};
const expTypeOrder: Experience['type'][] = [
  'internship',
  'training_project',
  'campus',
  'competition',
];

function groupByType(experiences: Experience[]) {
  const g: Record<Experience['type'], Experience[]> = {
    internship: [],
    training_project: [],
    campus: [],
    competition: [],
  };
  for (const e of experiences) g[e.type].push(e);
  return g;
}

function groupSkillsByCategory(skills: Resume['skills']) {
  const g: Record<string, string[]> = {};
  for (const s of skills) {
    const k = s.category ?? '通用';
    if (!g[k]) g[k] = [];
    g[k].push(s.name);
  }
  return g;
}

/* ===== 共通 blocks ===== */

function headerBlock(basic: Resume['basic']) {
  return `
<div class="header">
  <div>
    <h1>个人简历</h1>
    <p class="objective">${esc(basic.objective)}</p>
  </div>
  <div class="resume-en">RESUME</div>
</div>`;
}

function basicBlock(basic: Resume['basic']) {
  const fields: Array<[string, string | undefined]> = [
    ['姓名', basic.name],
    ['手机', basic.phone],
    ['邮箱', basic.email],
    ['出生年月', basic.birth],
    ['籍贯', basic.hometown],
    ['政治面貌', basic.politicalStatus],
  ];
  const items = fields
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `<div><span class="label">${esc(k)}：</span>${esc(v)}</div>`)
    .join('');
  return `
<section class="block">
  ${sectionTitle('基本信息')}
  <div class="basic-grid">${items}</div>
</section>`;
}

function educationBlock(education: Resume['education']) {
  if (!education?.length) return '';
  const items = education
    .map(
      (e) => `
    <div class="edu-item">
      <div class="row">
        <span class="strong">${esc(e.school)}<span class="muted ml"> ${esc(e.major)}</span>${
          e.degree ? `<span class="muted ml">· ${esc(e.degree)}</span>` : ''
        }</span>
        <span class="muted">${esc(e.period)}</span>
      </div>
      ${e.gpa ? `<div class="small">GPA：${esc(e.gpa)}</div>` : ''}
      ${e.courses ? `<div class="small">主修课程：${esc(e.courses)}</div>` : ''}
    </div>`
    )
    .join('');
  return `
<section class="block edu">
  ${sectionTitle('教育背景')}
  ${items}
</section>`;
}

function selfEvalBlock(text: string) {
  if (!text?.trim()) return '';
  return `
<section class="block">
  ${sectionTitle('自我评价')}
  <p class="para">${esc(text)}</p>
</section>`;
}

function skillsBlock(skills: Resume['skills']) {
  if (!skills?.length) return '';
  const groups = groupSkillsByCategory(skills);
  const rows = Object.entries(groups)
    .map(
      ([cat, items]) =>
        `<div><span class="label">${esc(cat)}：</span>${items.map(esc).join(' · ')}</div>`
    )
    .join('');
  return `
<section class="block">
  ${sectionTitle('技能与工具')}
  <div class="skills">${rows}</div>
</section>`;
}

function honorsBlock(honors?: string[]) {
  if (!honors?.length) return '';
  const items = honors.map((h) => `<li>${esc(h)}</li>`).join('');
  return `
<section class="block">
  ${sectionTitle('个人荣誉')}
  <ul>${items}</ul>
</section>`;
}

function sectionTitle(text: string) {
  return `<h2 class="sec"><span class="bar"></span>${esc(text)}</h2>`;
}

/* ===== 三种密度的经历渲染 ===== */

function renderExperiencesDense(experiences: Experience[]) {
  const groups = groupByType(experiences);
  return expTypeOrder
    .map((t) => {
      const list = groups[t];
      if (!list?.length) return '';
      const items = list
        .map((e) => {
          const bullets = [
            ...e.actions.map((a) => `<li>${esc(a)}</li>`),
            ...e.results.map((r) => `<li class="result">${esc(r)}</li>`),
          ].join('');
          return `
      <div class="exp-item">
        <div class="row">
          <span class="strong">${esc(e.org)}<span class="muted ml">· ${esc(e.role)}</span></span>
          ${e.period ? `<span class="muted">${esc(e.period)}</span>` : ''}
        </div>
        <ul class="tight">${bullets}</ul>
      </div>`;
        })
        .join('');
      return `<section class="block">${sectionTitle(expTypeLabels[t])}${items}</section>`;
    })
    .join('');
}

function renderExperiencesLoose(experiences: Experience[]) {
  const groups = groupByType(experiences);
  return expTypeOrder
    .map((t) => {
      const list = groups[t];
      if (!list?.length) return '';
      const items = list
        .map((e) => {
          const narrative =
            [e.background, ...e.actions.map((a) => a.replace(/^[\s·-]+/, ''))]
              .filter(Boolean)
              .join('；') + '。';
          return `
      <div class="exp-item loose">
        <div class="row">
          <span class="strong">${esc(e.org)}<span class="muted ml">· ${esc(e.role)}</span></span>
          ${e.period ? `<span class="muted">${esc(e.period)}</span>` : ''}
        </div>
        <p class="para">${esc(narrative)}</p>
        <p class="result-line">${esc(e.results.join('；'))}。</p>
      </div>`;
        })
        .join('');
      return `<section class="block">${sectionTitle(expTypeLabels[t])}${items}</section>`;
    })
    .join('');
}

function renderExperiencesStructured(experiences: Experience[]) {
  const groups = groupByType(experiences);
  return expTypeOrder
    .map((t) => {
      const list = groups[t];
      if (!list?.length) return '';
      const items = list
        .map((e) => {
          const tags = [...(e.modelsUsed ?? []), ...(e.toolsUsed ?? [])]
            .map((m) => `<span class="tag">${esc(m)}</span>`)
            .join('');
          const actions = e.actions.map((a) => `<li>${esc(a)}</li>`).join('');
          return `
      <div class="exp-item card">
        <div class="row">
          <span class="strong">${esc(e.org)}<span class="muted ml">· ${esc(e.role)}</span></span>
          ${e.period ? `<span class="muted">${esc(e.period)}</span>` : ''}
        </div>
        ${e.background ? `<div class="seg"><span class="seg-label">背景</span><span>${esc(e.background)}</span></div>` : ''}
        <div class="seg"><span class="seg-label">行动</span><ul class="inline">${actions}</ul></div>
        <div class="seg result-seg"><span class="seg-label">结果</span><span class="strong">${esc(e.results.join('；'))}</span></div>
        ${tags ? `<div class="tags">${tags}</div>` : ''}
      </div>`;
        })
        .join('');
      return `<section class="block">${sectionTitle(expTypeLabels[t])}${items}</section>`;
    })
    .join('');
}

/* ===== 入口：拼整页 HTML ===== */

export function renderResumeHtml(resume: Resume, template: TemplateKind): string {
  const expHtml =
    template === 'loose'
      ? renderExperiencesLoose(resume.experiences)
      : template === 'structured'
        ? renderExperiencesStructured(resume.experiences)
        : renderExperiencesDense(resume.experiences);

  const body = `
<div class="page">
  ${headerBlock(resume.basic)}
  ${basicBlock(resume.basic)}
  ${educationBlock(resume.education)}
  ${expHtml}
  ${skillsBlock(resume.skills)}
  ${selfEvalBlock(resume.selfEvaluation)}
  ${honorsBlock(resume.honors)}
</div>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>resume</title>
<style>${PRINT_CSS}</style>
</head>
<body>${body}</body>
</html>`;
}

const PRINT_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, -apple-system, sans-serif;
  color: #1f2937;
  background: white;
  font-size: 11pt;
  line-height: 1.5;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.page { padding: 0; }
.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 2px solid #2563eb;
  padding-bottom: 10px;
  margin-bottom: 14px;
}
.header h1 {
  font-size: 26pt;
  font-weight: 800;
  letter-spacing: 4px;
  color: #0f172a;
}
.objective { font-size: 11pt; color: #1d4ed8; font-weight: 500; margin-top: 4px; }
.resume-en {
  font-size: 26pt;
  font-weight: 700;
  color: #dbeafe;
  letter-spacing: 6px;
  user-select: none;
}
h2.sec {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12pt;
  font-weight: 700;
  color: #0f172a;
  margin: 12px 0 6px;
}
.bar {
  display: inline-block;
  width: 4px;
  height: 14px;
  background: #2563eb;
  border-radius: 1px;
}
.block { break-inside: avoid; page-break-inside: avoid; }
.basic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 24px;
  row-gap: 4px;
  font-size: 10.5pt;
  color: #334155;
}
.label { color: #64748b; }
.muted { color: #64748b; font-weight: 400; }
.ml { margin-left: 8px; }
.row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 11pt;
}
.strong { font-weight: 600; color: #0f172a; }
.small { font-size: 9.5pt; color: #475569; margin-top: 1px; }
.para { font-size: 11pt; color: #334155; line-height: 1.7; }
.skills > div { font-size: 10.5pt; color: #334155; margin-bottom: 2px; }
.exp-item { margin-bottom: 8px; break-inside: avoid; }
.exp-item.loose { margin-bottom: 12px; }
.exp-item ul.tight { margin: 2px 0 0 20px; }
.exp-item ul.tight li { font-size: 10.5pt; color: #334155; margin: 1px 0; }
.exp-item ul.tight li.result { color: #1d4ed8; font-weight: 500; }
.result-line { color: #1d4ed8; font-weight: 500; font-size: 10.5pt; margin-top: 2px; }
.exp-item.card {
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 8px 10px;
  margin-bottom: 8px;
}
.seg { font-size: 10pt; margin: 3px 0; }
.seg-label {
  display: inline-block;
  font-size: 8.5pt;
  font-weight: 700;
  color: #64748b;
  margin-right: 6px;
}
.seg .inline {
  display: inline-block;
  vertical-align: top;
  margin-left: 0;
  padding-left: 18px;
}
.seg .inline li { font-size: 10pt; color: #334155; }
.result-seg { background: #eff6ff; padding: 4px 8px; border-radius: 3px; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.tag {
  font-size: 8.5pt;
  background: #f1f5f9;
  color: #475569;
  padding: 1px 6px;
  border-radius: 3px;
}
ul { margin: 4px 0 4px 18px; }
li { margin: 1px 0; font-size: 10.5pt; color: #334155; }
.edu-item { margin-bottom: 4px; }

@page { size: A4; margin: 12mm 14mm; }
@media print { .header { break-inside: avoid; } }
`;

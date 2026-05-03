import type { Resume, Experience } from '@/lib/schema/resume';

export const expTypeLabels: Record<Experience['type'], string> = {
  internship: '实习经历',
  training_project: '项目经历',
  campus: '校园经历',
  competition: '竞赛经历',
};

export const expTypeOrder: Experience['type'][] = [
  'internship',
  'training_project',
  'campus',
  'competition',
];

export function groupByType(experiences: Experience[]) {
  const groups: Record<Experience['type'], Experience[]> = {
    internship: [],
    training_project: [],
    campus: [],
    competition: [],
  };
  for (const e of experiences) groups[e.type].push(e);
  return groups;
}

export function groupSkillsByCategory(skills: Resume['skills']) {
  const groups: Record<string, string[]> = {};
  for (const s of skills) {
    const k = s.category ?? '通用';
    if (!groups[k]) groups[k] = [];
    groups[k].push(s.name);
  }
  return groups;
}

/** 蓝色应届风格的板块标题 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="experience-block flex items-center gap-2 mb-2 mt-4">
      <span className="inline-block w-1 h-4 bg-blue-600 rounded-sm" />
      <span className="text-base font-bold text-slate-900">{children}</span>
    </h2>
  );
}

/** 顶部 banner：姓名 + 求职意向 + 装饰描边字 */
export function ResumeHeader({ basic }: { basic: Resume['basic'] }) {
  return (
    <div className="flex items-end justify-between border-b-2 border-blue-600 pb-3 mb-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-wider text-slate-900">个人简历</h1>
        <p className="text-sm text-blue-700 font-medium mt-1">{basic.objective}</p>
      </div>
      <div className="text-3xl font-bold text-blue-100 select-none tracking-widest">RESUME</div>
    </div>
  );
}

/** 基本信息区 */
export function BasicInfoBlock({ basic }: { basic: Resume['basic'] }) {
  const fields: Array<[string, string | undefined]> = [
    ['姓名', basic.name],
    ['手机', basic.phone],
    ['邮箱', basic.email],
    ['出生年月', basic.birth],
    ['籍贯', basic.hometown],
    ['政治面貌', basic.politicalStatus],
  ];
  return (
    <section className="experience-block">
      <SectionTitle>基本信息</SectionTitle>
      <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-sm text-slate-700">
        {fields
          .filter(([, v]) => v && v.trim())
          .map(([k, v]) => (
            <div key={k}>
              <span className="text-slate-500">{k}：</span>
              <span>{v}</span>
            </div>
          ))}
      </div>
    </section>
  );
}

/** 教育背景 */
export function EducationBlock({ education }: { education: Resume['education'] }) {
  if (!education?.length) return null;
  return (
    <section className="education-block">
      <SectionTitle>教育背景</SectionTitle>
      {education.map((e, i) => (
        <div key={i} className="text-sm text-slate-700 mb-1.5">
          <div className="flex justify-between font-medium">
            <span>
              {e.school}
              <span className="text-slate-500 font-normal ml-2">{e.major}</span>
              {e.degree && <span className="text-slate-500 font-normal ml-1">· {e.degree}</span>}
            </span>
            <span className="text-slate-500">{e.period}</span>
          </div>
          {e.gpa && <div className="text-xs text-slate-600 mt-0.5">GPA：{e.gpa}</div>}
          {e.courses && (
            <div className="text-xs text-slate-600 leading-relaxed mt-0.5">
              主修课程：{e.courses}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/** 自我评价 */
export function SelfEvaluationBlock({ text }: { text: string }) {
  if (!text?.trim()) return null;
  return (
    <section className="experience-block">
      <SectionTitle>自我评价</SectionTitle>
      <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
    </section>
  );
}

/** 技能（按 category 分组） */
export function SkillsBlock({ skills }: { skills: Resume['skills'] }) {
  if (!skills?.length) return null;
  const groups = groupSkillsByCategory(skills);
  return (
    <section className="experience-block">
      <SectionTitle>技能与工具</SectionTitle>
      <div className="space-y-1 text-sm text-slate-700">
        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat}>
            <span className="text-slate-500 mr-2">{cat}：</span>
            <span>{items.join(' · ')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 个人荣誉 */
export function HonorsBlock({ honors }: { honors?: string[] }) {
  if (!honors?.length) return null;
  return (
    <section className="experience-block">
      <SectionTitle>个人荣誉</SectionTitle>
      <ul className="text-sm text-slate-700 space-y-0.5 list-disc pl-5">
        {honors.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </section>
  );
}

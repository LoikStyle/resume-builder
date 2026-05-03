'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import type {
  Resume,
  Experience,
  Education,
  Skill,
} from '@/lib/schema/resume';

type Props = {
  data: Resume;
  onChange: (next: Resume) => void;
};

const expTypeOptions: Array<{ value: Experience['type']; label: string }> = [
  { value: 'internship', label: '实习经历' },
  { value: 'training_project', label: '项目经历' },
  { value: 'campus', label: '校园经历' },
  { value: 'competition', label: '竞赛经历' },
];

const skillCategories: Array<NonNullable<Skill['category']>> = [
  '模型',
  '评测框架',
  '标注方法',
  '自动化工具',
  '通用',
];

export default function ResumeForm({ data, onChange }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    self: true,
    education: true,
    experiences: true,
    skills: true,
    honors: true,
  });

  const toggle = (k: string) =>
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  /* ---------- 基本信息 ---------- */
  const updateBasic = (patch: Partial<Resume['basic']>) =>
    onChange({ ...data, basic: { ...data.basic, ...patch } });

  /* ---------- 自我评价 ---------- */
  const updateSelfEval = (text: string) =>
    onChange({ ...data, selfEvaluation: text });

  /* ---------- 教育 ---------- */
  const updateEdu = (idx: number, patch: Partial<Education>) => {
    const arr = data.education.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    onChange({ ...data, education: arr });
  };
  const addEdu = () =>
    onChange({
      ...data,
      education: [
        ...data.education,
        { period: '', school: '', major: '', degree: undefined, gpa: '', courses: '' },
      ],
    });
  const removeEdu = (idx: number) =>
    onChange({ ...data, education: data.education.filter((_, i) => i !== idx) });

  /* ---------- 经历 ---------- */
  const updateExp = (idx: number, patch: Partial<Experience>) => {
    const arr = data.experiences.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    onChange({ ...data, experiences: arr });
  };
  const addExp = () => {
    if (data.experiences.length >= 6) return;
    onChange({
      ...data,
      experiences: [
        ...data.experiences,
        {
          id: nanoid(),
          type: 'training_project',
          org: '',
          role: '独立完成',
          background: '',
          actions: [''],
          results: [''],
        },
      ],
    });
  };
  const removeExp = (idx: number) => {
    if (data.experiences.length <= 4) return;
    onChange({ ...data, experiences: data.experiences.filter((_, i) => i !== idx) });
  };
  const moveExp = (idx: number, dir: -1 | 1) => {
    const next = [...data.experiences];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange({ ...data, experiences: next });
  };
  const updateActions = (idx: number, actions: string[]) =>
    updateExp(idx, { actions });
  const updateResults = (idx: number, results: string[]) =>
    updateExp(idx, { results });

  /* ---------- 技能 ---------- */
  const updateSkill = (idx: number, patch: Partial<Skill>) => {
    const arr = data.skills.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...data, skills: arr });
  };
  const addSkill = () =>
    onChange({ ...data, skills: [...data.skills, { name: '', category: '通用' }] });
  const removeSkill = (idx: number) =>
    onChange({ ...data, skills: data.skills.filter((_, i) => i !== idx) });

  /* ---------- 荣誉 ---------- */
  const updateHonor = (idx: number, value: string) => {
    const arr = (data.honors ?? []).map((h, i) => (i === idx ? value : h));
    onChange({ ...data, honors: arr });
  };
  const addHonor = () =>
    onChange({ ...data, honors: [...(data.honors ?? []), ''] });
  const removeHonor = (idx: number) =>
    onChange({
      ...data,
      honors: (data.honors ?? []).filter((_, i) => i !== idx),
    });

  return (
    <div className="space-y-3">
      {/* 基本信息 */}
      <Section title="基本信息" open={openSections.basic} onToggle={() => toggle('basic')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="姓名" value={data.basic.name} onChange={(v) => updateBasic({ name: v })} />
          <Field
            label="求职意向"
            value={data.basic.objective}
            onChange={(v) => updateBasic({ objective: v })}
          />
          <Field label="手机" value={data.basic.phone} onChange={(v) => updateBasic({ phone: v })} />
          <Field label="邮箱" value={data.basic.email} onChange={(v) => updateBasic({ email: v })} />
          <Field
            label="出生年月"
            value={data.basic.birth ?? ''}
            onChange={(v) => updateBasic({ birth: v })}
          />
          <Field
            label="籍贯"
            value={data.basic.hometown ?? ''}
            onChange={(v) => updateBasic({ hometown: v })}
          />
          <Field
            label="政治面貌"
            value={data.basic.politicalStatus ?? ''}
            onChange={(v) => updateBasic({ politicalStatus: v })}
          />
        </div>
      </Section>

      {/* 自我评价 */}
      <Section title="自我评价" open={openSections.self} onToggle={() => toggle('self')}>
        <textarea
          value={data.selfEvaluation}
          onChange={(e) => updateSelfEval(e.target.value)}
          rows={4}
          maxLength={300}
          className="w-full text-sm rounded border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">
          {data.selfEvaluation.length} / 300
        </p>
      </Section>

      {/* 教育 */}
      <Section title="教育背景" open={openSections.education} onToggle={() => toggle('education')}>
        {data.education.map((e, i) => (
          <div key={i} className="border border-slate-200 rounded p-2.5 mb-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="时间" value={e.period} onChange={(v) => updateEdu(i, { period: v })} />
              <Field label="学校" value={e.school} onChange={(v) => updateEdu(i, { school: v })} />
              <Field label="专业" value={e.major} onChange={(v) => updateEdu(i, { major: v })} />
              <Field
                label="GPA"
                value={e.gpa ?? ''}
                onChange={(v) => updateEdu(i, { gpa: v })}
              />
            </div>
            <Field
              label="主修课程"
              value={e.courses ?? ''}
              onChange={(v) => updateEdu(i, { courses: v })}
            />
            {data.education.length > 1 && (
              <button
                onClick={() => removeEdu(i)}
                className="text-xs text-red-600 hover:underline"
              >
                删除这条
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addEdu}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + 添加教育经历
        </button>
      </Section>

      {/* 经历 */}
      <Section
        title={`经历（${data.experiences.length} / 4-6）`}
        open={openSections.experiences}
        onToggle={() => toggle('experiences')}
      >
        {data.experiences.map((e, i) => (
          <div
            key={e.id}
            className="border border-slate-200 rounded p-2.5 mb-2 space-y-2 bg-slate-50/40"
          >
            <div className="flex items-center gap-2 text-xs">
              <select
                value={e.type}
                onChange={(ev) =>
                  updateExp(i, { type: ev.target.value as Experience['type'] })
                }
                className="px-2 py-1 rounded border border-slate-200 bg-white"
              >
                {expTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => moveExp(i, -1)}
                  disabled={i === 0}
                  className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                  title="上移"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveExp(i, 1)}
                  disabled={i === data.experiences.length - 1}
                  className="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                  title="下移"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeExp(i)}
                  disabled={data.experiences.length <= 4}
                  className="px-1.5 py-0.5 text-red-500 hover:text-red-700 disabled:opacity-30"
                  title="删除（不少于 4 项）"
                >
                  ×
                </button>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field
                label="组织 / 项目名"
                value={e.org}
                onChange={(v) => updateExp(i, { org: v })}
              />
              <Field label="角色" value={e.role} onChange={(v) => updateExp(i, { role: v })} />
            </div>

            <Textarea
              label="背景（1 句话）"
              value={e.background}
              rows={2}
              onChange={(v) => updateExp(i, { background: v })}
            />

            <ListField
              label="行动 bullets（≥ 2 条）"
              items={e.actions}
              onChange={(items) => updateActions(i, items)}
              placeholder="例：搭建 5 维度评测体系，组织多人盲标"
            />
            <ListField
              label="量化结果（≥ 1 条）"
              items={e.results}
              onChange={(items) => updateResults(i, items)}
              placeholder="例：横评 6 款模型，覆盖 4 类场景"
            />
          </div>
        ))}
        {data.experiences.length < 6 && (
          <button
            type="button"
            onClick={addExp}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + 添加一项经历（最多 6 项）
          </button>
        )}
        {data.experiences.length < 4 && (
          <p className="text-xs text-amber-600 mt-1">
            建议至少 4 项经历（当前 {data.experiences.length} 项）
          </p>
        )}
      </Section>

      {/* 技能 */}
      <Section title="技能与工具" open={openSections.skills} onToggle={() => toggle('skills')}>
        <div className="space-y-1.5">
          {data.skills.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={s.name}
                onChange={(e) => updateSkill(i, { name: e.target.value })}
                className="flex-1 text-sm px-2 py-1 rounded border border-slate-200"
                placeholder="技能名"
              />
              <select
                value={s.category ?? '通用'}
                onChange={(e) =>
                  updateSkill(i, { category: e.target.value as Skill['category'] })
                }
                className="text-xs px-2 py-1 rounded border border-slate-200 bg-white"
              >
                {skillCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeSkill(i)}
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSkill}
          className="text-sm text-blue-600 hover:text-blue-700 mt-2"
        >
          + 添加技能
        </button>
      </Section>

      {/* 荣誉 */}
      <Section title="个人荣誉" open={openSections.honors} onToggle={() => toggle('honors')}>
        <div className="space-y-1.5">
          {(data.honors ?? []).map((h, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={h}
                onChange={(e) => updateHonor(i, e.target.value)}
                className="flex-1 text-sm px-2 py-1 rounded border border-slate-200"
                placeholder="例：英语六级证书"
              />
              <button
                onClick={() => removeHonor(i)}
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addHonor}
          className="text-sm text-blue-600 hover:text-blue-700 mt-2"
        >
          + 添加荣誉
        </button>
      </Section>
    </div>
  );
}

/* ---------- 复用小组件 ---------- */

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg border border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-900"
      >
        <span>{title}</span>
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full text-sm px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? 2}
        className="mt-0.5 w-full text-sm px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
    </label>
  );
}

function ListField({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const update = (idx: number, value: string) => {
    const arr = [...items];
    arr[idx] = value;
    onChange(arr);
  };
  const add = () => onChange([...items, '']);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-sm px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {items.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
      >
        + 加一条
      </button>
    </div>
  );
}

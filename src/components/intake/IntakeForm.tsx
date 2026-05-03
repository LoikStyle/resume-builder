'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  WORK_YEARS_OPTIONS,
  INDUSTRY_OPTIONS,
  COURSE_PROJECT_OPTIONS,
  MODEL_TOOL_OPTIONS,
  MODEL_TOOL_MIN,
  MODEL_TOOL_MAX,
} from './questions';
import SubscenarioPicker from './SubscenarioPicker';
import { useResumeStore } from '@/store/resume-store';
import type { IntakeAnswers, WorkYears } from '@/lib/schema/resume';

type FormState = {
  // 基本信息
  name: string;
  phone: string;
  email: string;
  school: string;
  major: string;
  graduation: string;
  // 段 0
  workYears: WorkYears;
  industryCategory: string;
  subScenarios: string[];
  courseProjects: string[];
  pathwayScene: string;
  modelsTools: string[];
};

const initialState: FormState = {
  name: '',
  phone: '',
  email: '',
  school: '',
  major: '',
  graduation: '',
  workYears: '0',
  industryCategory: '',
  subScenarios: [],
  courseProjects: [],
  pathwayScene: '',
  modelsTools: [],
};

export default function IntakeForm() {
  const router = useRouter();
  const sourceInput = useResumeStore((s) => s.sourceInput);
  const setSourceInput = useResumeStore((s) => s.setSourceInput);
  const setResume = useResumeStore((s) => s.setResume);

  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleArray = (
    key: 'subScenarios' | 'courseProjects' | 'modelsTools',
    value: string
  ) => {
    setForm((f) => {
      const arr = f[key];
      const has = arr.includes(value);
      // modelsTools 限 MAX
      if (key === 'modelsTools' && !has && arr.length >= MODEL_TOOL_MAX) return f;
      // subScenarios 限 3 个
      if (key === 'subScenarios' && !has && arr.length >= 3) return f;
      return {
        ...f,
        [key]: has ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  async function handleSubmit() {
    if (!form.name.trim() || !form.school.trim()) {
      setError('请至少填姓名和毕业院校');
      return;
    }
    if (!form.industryCategory) {
      setError('请选 1 个行业大类');
      return;
    }
    if (form.courseProjects.length === 0) {
      setError('至少勾选 1 个课程项目');
      return;
    }
    if (form.modelsTools.length < MODEL_TOOL_MIN) {
      setError(`模型 / 工具至少选 ${MODEL_TOOL_MIN} 个`);
      return;
    }

    const answers: IntakeAnswers = {
      workYears: form.workYears,
      industryCategory: form.industryCategory,
      subScenarios: form.subScenarios,
      courseProjects: form.courseProjects,
      pathwayScene: form.pathwayScene || undefined,
      modelsTools: form.modelsTools,
    };

    const basicInfo = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      school: form.school.trim(),
      major: form.major.trim(),
      graduation: form.graduation.trim(),
    };

    setSourceInput(sourceInput.scenario, answers);
    setSubmitting(true);
    setError(null);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: sourceInput.scenario,
          intakeAnswers: answers,
          basicInfo,
        }),
      });
      if (!resp.ok) throw new Error(`生成失败：${resp.status}`);
      const json = (await resp.json()) as { resume?: unknown; error?: string };
      if (json.error) throw new Error(json.error);
      if (!json.resume) throw new Error('未返回 resume 字段');
      setResume(json.resume as never);
      router.push('/editor');
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 py-8 px-6">
      <header className="space-y-2">
        <p className="text-sm text-blue-600 font-medium">先填基本信息，再答 4 题</p>
        <h1 className="text-2xl font-bold">告诉我你的方向和项目</h1>
        <p className="text-sm text-slate-500">
          填得越完整，AI 帮你写的简历就越像"你"。
        </p>
      </header>

      {/* 基本信息 */}
      <section className="space-y-3 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
        <h2 className="font-semibold text-base text-blue-900">基本信息</h2>
        <div className="grid grid-cols-2 gap-3">
          <BasicField label="姓名 *" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="张三" />
          <BasicField label="毕业院校 *" value={form.school} onChange={(v) => setForm((f) => ({ ...f, school: v }))} placeholder="某某大学" />
          <BasicField label="手机号" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="13800138000" />
          <BasicField label="邮箱" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="zhangsan@example.com" />
          <BasicField label="专业" value={form.major} onChange={(v) => setForm((f) => ({ ...f, major: v }))} placeholder="计算机科学与技术" />
          <BasicField label="毕业时间" value={form.graduation} onChange={(v) => setForm((f) => ({ ...f, graduation: v }))} placeholder="2025.06" />
        </div>
      </section>

      {/* Q1 工作年限 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">1.</span>
          工作年限
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WORK_YEARS_OPTIONS.map((opt) => {
            const selected = form.workYears === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, workYears: opt.value }))}
                className={`text-sm px-3 py-3 rounded-lg border transition ${
                  selected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          影响项目动词风格（应届偏执行 → 资深偏统筹）。
        </p>
      </section>

      {/* Q2 行业大类（单选） */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">2.</span>
          行业场景大类（单选 1 个）
        </h2>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((cat) => {
            const selected = form.industryCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    industryCategory: cat,
                    // 切换大类时清空已选细分场景
                    subScenarios: [],
                  }))
                }
                className={`text-sm px-3 py-2 rounded-lg border transition ${
                  selected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Q3 细分场景（AI 动态生成 + 多选 1-3 个） */}
      {form.industryCategory && (
        <section className="space-y-3">
          <h2 className="font-semibold text-base">
            <span className="text-blue-600 mr-2">3.</span>
            细分场景（AI 生成，多选 1-3 个）
          </h2>
          <SubscenarioPicker
            category={form.industryCategory}
            selected={form.subScenarios}
            onToggle={(name) => toggleArray('subScenarios', name)}
          />
        </section>
      )}

      {/* Q4 课程项目（多选） */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">4.</span>
          做过的项目（多选）
        </h2>
        <div className="flex flex-wrap gap-2">
          {COURSE_PROJECT_OPTIONS.map((proj) => {
            const selected = form.courseProjects.includes(proj);
            return (
              <button
                key={proj}
                type="button"
                onClick={() => toggleArray('courseProjects', proj)}
                className={`text-sm px-3 py-2 rounded-lg border transition ${
                  selected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {proj}
              </button>
            );
          })}
        </div>
        {form.courseProjects.includes('小组评测路演') && (
          <input
            type="text"
            value={form.pathwayScene}
            onChange={(e) => setForm((f) => ({ ...f, pathwayScene: e.target.value }))}
            placeholder="补充：路演的具体场景（如教育题目评测 / 客服 Bad Case 分析）"
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </section>

      {/* Q5 模型 / 工具（多选 3-5 个） */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">5.</span>
          用过的模型 / 工具（限选 {MODEL_TOOL_MIN}-{MODEL_TOOL_MAX} 个）
        </h2>
        <div className="text-xs text-slate-500">
          已选 {form.modelsTools.length} / {MODEL_TOOL_MAX}
        </div>
        {Object.entries(MODEL_TOOL_OPTIONS).map(([group, items]) => (
          <div key={group} className="space-y-2">
            <p className="text-xs text-slate-500">{group}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const selected = form.modelsTools.includes(item);
                const disabled =
                  !selected && form.modelsTools.length >= MODEL_TOOL_MAX;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleArray('modelsTools', item)}
                    className={`text-xs px-2.5 py-1.5 rounded-md border transition ${
                      selected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : disabled
                          ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
      >
        {submitting
          ? '生成中（约 3-4 分钟，调本地 Claude CLI）…'
          : '开始生成简历 →'}
      </button>
    </div>
  );
}

function BasicField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full text-sm px-3 py-1.5 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

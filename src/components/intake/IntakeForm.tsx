'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trainerQuestions } from './questions';
import { useResumeStore } from '@/store/resume-store';
import type { IntakeAnswers } from '@/lib/schema/resume';

type FormState = {
  // 基本信息（直接进 resume.basic，避免 [待补充]）
  name: string;
  phone: string;
  email: string;
  school: string;
  major: string;
  graduation: string;

  roleDirection: 'annotation' | 'eval' | 'mixed';
  sceneInterests: string[];
  courseProjects: string[];
  pathwayScene: string;
  modelsTools: {
    模型: string[];
    评测框架: string[];
    自动化工具: string[];
    标注方法: string[];
  };
  roleInProject: string;
  highlights: string[];
};

const initialState: FormState = {
  name: '',
  phone: '',
  email: '',
  school: '',
  major: '',
  graduation: '',
  roleDirection: 'mixed',
  sceneInterests: [],
  courseProjects: [],
  pathwayScene: '',
  modelsTools: { 模型: [], 评测框架: [], 自动化工具: [], 标注方法: [] },
  roleInProject: '独立完成',
  highlights: [''],
};

export default function IntakeForm() {
  const router = useRouter();
  const sourceInput = useResumeStore((s) => s.sourceInput);
  const setSourceInput = useResumeStore((s) => s.setSourceInput);
  const setResume = useResumeStore((s) => s.setResume);

  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleArray = (key: 'sceneInterests' | 'courseProjects', value: string) => {
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };
  const toggleGroup = (group: keyof FormState['modelsTools'], value: string) => {
    setForm((f) => {
      const arr = f.modelsTools[group];
      return {
        ...f,
        modelsTools: {
          ...f.modelsTools,
          [group]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
        },
      };
    });
  };

  function setHighlight(idx: number, value: string) {
    setForm((f) => {
      const arr = [...f.highlights];
      arr[idx] = value;
      return { ...f, highlights: arr };
    });
  }
  function addHighlight() {
    setForm((f) => ({ ...f, highlights: [...f.highlights, ''] }));
  }
  function removeHighlight(idx: number) {
    setForm((f) => ({
      ...f,
      highlights: f.highlights.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.school.trim()) {
      setError('请至少填姓名和毕业院校');
      return;
    }
    if (form.sceneInterests.length === 0) {
      setError('至少选 1 个感兴趣的场景');
      return;
    }
    if (form.courseProjects.length === 0) {
      setError('至少勾选 1 个课程项目');
      return;
    }
    const validHighlights = form.highlights.filter((h) => h.trim());
    if (validHighlights.length === 0) {
      setError('至少填 1 项量化亮点');
      return;
    }

    const answers: IntakeAnswers = {
      roleDirection: form.roleDirection,
      sceneInterests: form.sceneInterests,
      courseProjects: form.courseProjects,
      pathwayScene: form.pathwayScene || undefined,
      modelsTools: form.modelsTools,
      roleInProject: form.roleInProject,
      highlights: validHighlights,
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
      const msg = e instanceof Error ? e.message : '未知错误';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 py-8 px-6">
      <header className="space-y-2">
        <p className="text-sm text-blue-600 font-medium">先填基本信息，再答 6 题</p>
        <h1 className="text-2xl font-bold">告诉我你的项目和亮点</h1>
        <p className="text-sm text-slate-500">
          每题 30 秒就能答完。完整填写能让生成质量翻倍。
        </p>
      </header>

      {/* 基本信息（先填这个，避免初版简历都是 [待补充]） */}
      <section className="space-y-3 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
        <h2 className="font-semibold text-base text-blue-900">基本信息</h2>
        <div className="grid grid-cols-2 gap-3">
          <BasicField
            label="姓名 *"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="张三"
          />
          <BasicField
            label="毕业院校 *"
            value={form.school}
            onChange={(v) => setForm((f) => ({ ...f, school: v }))}
            placeholder="某某大学"
          />
          <BasicField
            label="手机号"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="13800138000"
          />
          <BasicField
            label="邮箱"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            placeholder="zhangsan@example.com"
          />
          <BasicField
            label="专业"
            value={form.major}
            onChange={(v) => setForm((f) => ({ ...f, major: v }))}
            placeholder="计算机科学与技术"
          />
          <BasicField
            label="毕业时间"
            value={form.graduation}
            onChange={(v) => setForm((f) => ({ ...f, graduation: v }))}
            placeholder="2025.06"
          />
        </div>
        <p className="text-xs text-slate-500">
          只有姓名和毕业院校必填，其它字段可以等会儿在编辑器里补。
        </p>
      </section>

      {trainerQuestions.map((q, idx) => (
        <section key={q.id} className="space-y-3">
          <h2 className="font-semibold text-base">
            <span className="text-blue-600 mr-2">{idx + 1}.</span>
            {q.label}
          </h2>

          {q.type === 'single' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt) => {
                const v = typeof opt === 'string' ? opt : opt.value;
                const label = typeof opt === 'string' ? opt : opt.label;
                const selected =
                  q.id === 'roleDirection'
                    ? form.roleDirection === v
                    : form.roleInProject === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      if (q.id === 'roleDirection') {
                        setForm((f) => ({ ...f, roleDirection: v as FormState['roleDirection'] }));
                      } else {
                        setForm((f) => ({ ...f, roleInProject: v }));
                      }
                    }}
                    className={`text-sm text-left px-4 py-3 rounded-lg border transition ${
                      selected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === 'multi' && (
            <>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const selected = (form[q.id as 'sceneInterests' | 'courseProjects'] as string[]).includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        toggleArray(q.id as 'sceneInterests' | 'courseProjects', opt)
                      }
                      className={`text-sm px-3 py-2 rounded-lg border transition ${
                        selected
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {q.customField && form.courseProjects.includes('小组评测路演') && (
                <input
                  type="text"
                  value={form.pathwayScene}
                  onChange={(e) => setForm((f) => ({ ...f, pathwayScene: e.target.value }))}
                  placeholder="补充说明：路演的具体场景（如：教育题目评测 / 客服 Bad Case 分析）"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </>
          )}

          {q.type === 'multiGroups' &&
            Object.entries(q.groups).map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="text-xs text-slate-500">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => {
                    const selected =
                      form.modelsTools[group as keyof FormState['modelsTools']].includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() =>
                          toggleGroup(group as keyof FormState['modelsTools'], item)
                        }
                        className={`text-xs px-2.5 py-1.5 rounded-md border transition ${
                          selected
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
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

          {q.type === 'multiFillable' && (
            <div className="space-y-2">
              {form.highlights.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={h}
                    onChange={(e) => setHighlight(i, e.target.value)}
                    placeholder={q.templates[i % q.templates.length]}
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {form.highlights.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHighlight(i)}
                      className="px-3 text-slate-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addHighlight}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + 再加一项
              </button>
              <div className="text-xs text-slate-400 space-y-1 pt-1">
                <p>参考模板（可直接复制改）：</p>
                {q.templates.map((t) => (
                  <p key={t}>· {t}</p>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}

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
        {submitting ? '生成中（约 3-4 分钟，调本地 Claude CLI）…' : '开始生成简历 →'}
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

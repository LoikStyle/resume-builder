'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AI_YEARS_OPTIONS,
  HIGHLIGHT_GROUPS,
  COURSE_PROJECT_GROUPS,
  PROJECT_DIRECTION_OPTIONS,
} from './questions';
import { INDUSTRIES } from '@/lib/industries';
import { useResumeStore } from '@/store/resume-store';
import type { IntakeAnswers, AIIndustryYears, ProjectDirection } from '@/lib/schema/resume';
import { validateField, validateBasicInfo, type FieldKey } from '@/lib/validators';

type FormState = {
  name: string;
  phone: string;
  email: string;
  school: string;
  major: string;
  graduation: string;
  projectDirection: ProjectDirection | '';
  courseProjectGroups: string[];
  courseProjects: string[];
  pathwayScene: string;
  industryCategory: string;
  industrySubtags: string[];
  subScenarios: string[];
  aiIndustryYears: AIIndustryYears;
  highlightFields: string[];
};

const initialState: FormState = {
  name: '',
  phone: '',
  email: '',
  school: '',
  major: '',
  graduation: '',
  projectDirection: '',
  courseProjectGroups: [],
  courseProjects: [],
  pathwayScene: '',
  industryCategory: '',
  industrySubtags: [],
  subScenarios: [],
  aiIndustryYears: '6m',
  highlightFields: [],
};

const COURSE_PROJECT_MAX = 5;
const HIGHLIGHT_MAX = 5;
const AESTHETIC_SUBTAG_MAX = 3;
const SUBMIT_LIMIT = 3;
const SUBMIT_COUNT_KEY = 'resume:submit-count';

type AuthUser = {
  union_id: string;
  name: string;
  email?: string;
  mobile?: string;
};

function deriveWorkYears(ai: AIIndustryYears): '0' | '<1' | '1-3' | '>3' {
  if (ai === '6m') return '<1';
  if (ai === '1y') return '1-3';
  return '>3';
}

export default function IntakeForm() {
  const sourceInput = useResumeStore((s) => s.sourceInput);
  const setSourceInput = useResumeStore((s) => s.setSourceInput);

  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feishuResult, setFeishuResult] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [honeypot, setHoneypot] = useState('');
  const [submitCount, setSubmitCount] = useState(0);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // 加载提交计数 + 拉登录态
  useEffect(() => {
    const cached = parseInt(localStorage.getItem(SUBMIT_COUNT_KEY) || '0', 10);
    setSubmitCount(Number.isFinite(cached) ? cached : 0);

    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/auth/me`)
      .then((r) => r.json())
      .then((j: { loggedIn?: boolean; user?: AuthUser }) => {
        if (j.loggedIn && j.user) {
          setAuthUser(j.user);
          // 自动预填基本信息
          setForm((f) => ({
            ...f,
            name: f.name || j.user!.name || '',
            email: f.email || j.user!.email || '',
            phone: f.phone || (j.user!.mobile ? j.user!.mobile.replace(/^\+86/, '') : ''),
          }));
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const currentIndustry = useMemo(
    () => INDUSTRIES.find((c) => c.name === form.industryCategory),
    [form.industryCategory]
  );

  const industryGroups = useMemo(() => {
    const map = new Map<string, typeof INDUSTRIES>();
    for (const ind of INDUSTRIES) {
      const arr = map.get(ind.group) ?? [];
      arr.push(ind);
      map.set(ind.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  useEffect(() => {
    if (!submitting) {
      setElapsedSec(0);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [submitting]);

  // 选「通用美学」方向 → 自动锁行业 = 通用美学（实习/大厂固化路线）
  useEffect(() => {
    if (form.projectDirection === '通用美学' && form.industryCategory !== '通用美学') {
      setForm((f) => ({
        ...f,
        industryCategory: '通用美学',
        industrySubtags: [],
      }));
    }
  }, [form.projectDirection, form.industryCategory]);

  // 取消选某个一级分组时，自动剔除该组下已选的二级项
  useEffect(() => {
    setForm((f) => {
      const allowed = new Set(
        COURSE_PROJECT_GROUPS.filter((g) => f.courseProjectGroups.includes(g.group)).flatMap(
          (g) => g.items
        )
      );
      const filtered = f.courseProjects.filter((p) => allowed.has(p));
      if (filtered.length === f.courseProjects.length) return f;
      return { ...f, courseProjects: filtered };
    });
  }, [form.courseProjectGroups]);

  const toggleArray = (
    key: 'courseProjects' | 'courseProjectGroups' | 'highlightFields' | 'industrySubtags',
    value: string,
    max?: number
  ) => {
    setForm((f) => {
      const arr = f[key];
      const has = arr.includes(value);
      if (!has && max && arr.length >= max) return f;
      return { ...f, [key]: has ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  function validate(): string | null {
    const basicErrors = validateBasicInfo({
      name: form.name,
      school: form.school,
      major: form.major,
      phone: form.phone,
      email: form.email,
      graduation: form.graduation,
    });
    if (basicErrors.length > 0) {
      const errMap: Partial<Record<FieldKey, string>> = {};
      for (const e of basicErrors) errMap[e.field] = e.error;
      setFieldErrors(errMap);
      return basicErrors[0].error;
    }
    setFieldErrors({});
    if (!form.projectDirection) return '请选模型方向';
    if (form.courseProjects.length === 0) return '至少勾选 1 个具体项目';
    if (!form.industryCategory) return '请选 1 个行业大类';
    return null;
  }

  function buildPayload() {
    if (!form.projectDirection) {
      throw new Error('内部错误：projectDirection 未选');
    }
    const answers: IntakeAnswers = {
      projectDirection: form.projectDirection,
      courseProjectGroups: form.courseProjectGroups,
      courseProjects: form.courseProjects,
      pathwayScene: form.pathwayScene || undefined,
      industryCategory: form.industryCategory,
      industrySubtags: form.industrySubtags,
      aiIndustryYears: form.aiIndustryYears,
      highlightFields: form.highlightFields,
      workYears: deriveWorkYears(form.aiIndustryYears),
    };
    const basicInfo = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      school: form.school.trim(),
      major: form.major.trim(),
      graduation: form.graduation.trim(),
    };
    return { answers, basicInfo };
  }

  async function handleSubmit() {
    if (!authUser) {
      setError('请先点右上角「飞书登录」');
      return;
    }
    if (submitCount >= SUBMIT_LIMIT) {
      setError(`已达提交上限（${SUBMIT_LIMIT} 次），如需修改请联系老师`);
      return;
    }
    const err = validate();
    if (err) return setError(err);

    const { answers, basicInfo } = buildPayload();
    setSourceInput(sourceInput.scenario, answers);
    setSubmitting(true);
    setError(null);
    setFeishuResult(null);

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/export-feishu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeAnswers: answers,
          basicInfo,
          _honeypot: honeypot,
        }),
      });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = (await resp.json()) as { mode?: string; record_id?: string; error?: string };
        if (!resp.ok) throw new Error(j.error ?? '导出失败');
        const newCount = submitCount + 1;
        setSubmitCount(newCount);
        try { localStorage.setItem(SUBMIT_COUNT_KEY, String(newCount)); } catch {}
        setFeishuResult(`✅ 提交成功（${newCount}/${SUBMIT_LIMIT}，record_id: ${j.record_id ?? '?'}）`);
      } else {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student-${form.name || 'untitled'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setFeishuResult('📥 已下载 JSON（飞书凭证未配置时的兜底）');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setSubmitting(false);
    }
  }

  // 未登录或还在检查登录态时，显示登录门禁
  if (authChecked && !authUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <h1 className="text-xl font-semibold">请先登录飞书</h1>
          <p className="text-sm text-slate-600">
            为了防止冒名提交，每位学生需用本人飞书账号登录。一次登录有效 24 小时。
          </p>
          <a
            href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/auth/feishu/start`}
            className="block w-full py-2.5 rounded-lg bg-blue-600 text-white font-medium text-center hover:bg-blue-700"
          >
            飞书一键登录
          </a>
          <p className="text-xs text-slate-400 text-center">
            登录会自动预填你的姓名 / 邮箱 / 手机号
          </p>
        </div>
      </div>
    );
  }
  if (!authChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
        登录态加载中…
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 py-8 px-6">
      {/* honeypot：机器人会填，真人看不见 */}
      <input
        type="text"
        name="_company"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
        aria-hidden="true"
      />

      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">告诉我你的项目、方向和偏好</h1>
          <p className="text-sm text-slate-500">
            填完提交，会写入飞书多维表格 · 已登录：<span className="text-blue-600">{authUser?.name}</span>
          </p>
        </div>
        <div className="text-xs text-slate-500 shrink-0 text-right space-y-1">
          <div>已提交 {submitCount}/{SUBMIT_LIMIT} 次</div>
          <button
            type="button"
            onClick={async () => {
              await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/auth/logout`, { method: 'POST' });
              location.reload();
            }}
            className="text-slate-400 hover:text-slate-600 underline"
          >
            退出登录
          </button>
        </div>
      </header>

      {/* 基本信息 */}
      <section className="space-y-3 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
        <h2 className="font-semibold text-base text-blue-900">基本信息</h2>
        <div className="grid grid-cols-2 gap-3">
          <BasicField label="姓名 *" value={form.name} fieldKey="name" placeholder="张三"
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            error={fieldErrors.name} setError={(e) => setFieldErrors((m) => ({ ...m, name: e }))} />
          <BasicField label="毕业院校 *" value={form.school} fieldKey="school" placeholder="某某大学"
            onChange={(v) => setForm((f) => ({ ...f, school: v }))}
            error={fieldErrors.school} setError={(e) => setFieldErrors((m) => ({ ...m, school: e }))} />
          <BasicField label="手机号" value={form.phone} fieldKey="phone" placeholder="13800138000"
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            error={fieldErrors.phone} setError={(e) => setFieldErrors((m) => ({ ...m, phone: e }))} />
          <BasicField label="邮箱" value={form.email} fieldKey="email" placeholder="zhangsan@example.com"
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            error={fieldErrors.email} setError={(e) => setFieldErrors((m) => ({ ...m, email: e }))} />
          <BasicField label="专业 *" value={form.major} fieldKey="major" placeholder="计算机科学与技术"
            onChange={(v) => setForm((f) => ({ ...f, major: v }))}
            error={fieldErrors.major} setError={(e) => setFieldErrors((m) => ({ ...m, major: e }))} />
          <BasicField label="毕业时间" value={form.graduation} fieldKey="graduation" placeholder="2025.06"
            onChange={(v) => setForm((f) => ({ ...f, graduation: v }))}
            error={fieldErrors.graduation} setError={(e) => setFieldErrors((m) => ({ ...m, graduation: e }))} />
        </div>
      </section>

      {/* Q0 模型方向 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">1.</span>
          模型方向（单选 *）
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {PROJECT_DIRECTION_OPTIONS.map((opt) => {
            const selected = form.projectDirection === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, projectDirection: opt.value }))}
                className={`text-sm px-3 py-2.5 rounded-lg border transition text-left ${
                  selected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{opt.hint}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Q2 做过的项目（标注 + 评测，可同时选，总数 ≤5） */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-base">
            <span className="text-blue-600 mr-2">2.</span>
            做过的项目（标注 / 评测可同时选 *）
          </h2>
          <span className="text-xs text-slate-500">
            已选 {form.courseProjects.length}/{COURSE_PROJECT_MAX}
          </span>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">
            先选方向（标注 / 评测，可全选）
          </p>
          <div className="flex flex-wrap gap-2">
            {COURSE_PROJECT_GROUPS.map((g) => {
              const selected = form.courseProjectGroups.includes(g.group);
              return (
                <button
                  key={g.group}
                  type="button"
                  onClick={() => toggleArray('courseProjectGroups', g.group)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition ${
                    selected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
                  }`}
                >
                  {g.group}
                </button>
              );
            })}
          </div>
        </div>

        {form.courseProjectGroups.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-slate-500">
              再选具体任务（总数 ≤ {COURSE_PROJECT_MAX}）
            </p>
            {COURSE_PROJECT_GROUPS.filter((g) => form.courseProjectGroups.includes(g.group)).map(
              (g) => (
                <div key={g.group} className="space-y-1">
                  <p className="text-[11px] text-slate-400">{g.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((proj) => {
                      const selected = form.courseProjects.includes(proj);
                      const disabled = !selected && form.courseProjects.length >= COURSE_PROJECT_MAX;
                      return (
                        <button
                          key={proj}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleArray('courseProjects', proj, COURSE_PROJECT_MAX)}
                          className={`text-xs px-2.5 py-1 rounded border transition ${
                            selected
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : disabled
                                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {proj}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* Q3 行业大类 + 二级专业标签 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">3.</span>
          行业（单选 *）
        </h2>
        {form.projectDirection === '通用美学' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            已选「通用美学」方向，行业自动锁定为「通用美学」（实习生 / 大厂通用线，固化 PE）
          </p>
        )}
        <div className="space-y-3">
          {industryGroups.map(([groupName, list]) => (
            <div key={groupName} className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                {groupName}
              </p>
              <div className="flex flex-wrap gap-2">
                {list.map((cat) => {
                  const selected = form.industryCategory === cat.name;
                  const lockedByAesthetic =
                    form.projectDirection === '通用美学' && cat.name !== '通用美学';
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      disabled={lockedByAesthetic}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          industryCategory: cat.name,
                          industrySubtags: [],
                          subScenarios: [],
                        }))
                      }
                      title={cat.description}
                      className={`text-sm px-3 py-1.5 rounded-full border transition ${
                        selected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : lockedByAesthetic
                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {currentIndustry && currentIndustry.subtags.length > 0 && (() => {
          const isAesthetic = currentIndustry.name === '通用美学';
          const label = isAesthetic
            ? `美学维度（多选 1-${AESTHETIC_SUBTAG_MAX}，已选 ${form.industrySubtags.length}/${AESTHETIC_SUBTAG_MAX}）`
            : '专业方向（单选）';
          return (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-slate-500">{label}</p>
            <div className="flex flex-wrap gap-2">
              {currentIndustry.subtags.map((tag) => {
                const selected = form.industrySubtags.includes(tag);
                const disabled =
                  isAesthetic &&
                  !selected &&
                  form.industrySubtags.length >= AESTHETIC_SUBTAG_MAX;
                return (
                  <button
                    key={tag}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (isAesthetic) {
                        toggleArray('industrySubtags', tag, AESTHETIC_SUBTAG_MAX);
                      } else {
                        setForm((f) => ({
                          ...f,
                          industrySubtags: selected ? [] : [tag],
                        }));
                      }
                    }}
                    className={`text-xs px-2.5 py-1 rounded border transition ${
                      selected
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : disabled
                          ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })()}
      </section>

      {/* Q4 AI 行业年限 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">4.</span>
          AI 行业年限
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AI_YEARS_OPTIONS.map((opt) => {
            const selected = form.aiIndustryYears === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, aiIndustryYears: opt.value }))}
                className={`text-sm px-3 py-3 rounded-lg border transition text-left ${
                  selected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{opt.hint}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Q5 高亮定制 */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-base">
            <span className="text-blue-600 mr-2">5.</span>
            高亮定制（多选 1-{HIGHLIGHT_MAX}）
          </h2>
          <span className="text-xs text-slate-500">
            已选 {form.highlightFields.length}/{HIGHLIGHT_MAX}
          </span>
        </div>
        <div className="space-y-3">
          {HIGHLIGHT_GROUPS.map((g) => (
            <div key={g.group} className="space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                {g.group}
              </p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((field) => {
                  const selected = form.highlightFields.includes(field);
                  const disabled = !selected && form.highlightFields.length >= HIGHLIGHT_MAX;
                  return (
                    <button
                      key={field}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleArray('highlightFields', field, HIGHLIGHT_MAX)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition text-left ${
                        selected
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : disabled
                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {field}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}
      {feishuResult && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          {feishuResult}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || submitCount >= SUBMIT_LIMIT}
        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
      >
        {submitting
          ? `提交中… ${elapsedSec}s`
          : submitCount >= SUBMIT_LIMIT
            ? `已达上限（${SUBMIT_LIMIT}/${SUBMIT_LIMIT}）`
            : `✅ 提交到飞书多维表格（${submitCount}/${SUBMIT_LIMIT}）`}
      </button>
    </div>
  );
}

function BasicField({
  label,
  value,
  onChange,
  placeholder,
  fieldKey,
  error,
  setError,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  fieldKey: FieldKey;
  error?: string;
  setError: (e: string | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-slate-600">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (error) setError(undefined);
        }}
        onBlur={(e) => {
          const v = e.target.value;
          if (v.trim() === '' && (fieldKey === 'name' || fieldKey === 'school' || fieldKey === 'major')) {
            setError(undefined);
            return;
          }
          if (v.trim() === '') return setError(undefined);
          const err = validateField(fieldKey, v);
          setError(err ?? undefined);
        }}
        placeholder={placeholder}
        className={`mt-0.5 w-full text-sm px-3 py-1.5 rounded border bg-white focus:outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-blue-500'
        }`}
      />
      {error && <span className="text-[11px] text-red-600 mt-0.5 inline-block">{error}</span>}
    </label>
  );
}

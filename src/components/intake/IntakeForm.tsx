'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AI_YEARS_OPTIONS,
  STRUCTURE_OPTIONS,
  HIGHLIGHT_OPTIONS,
  INDUSTRY_OPTIONS,
  COURSE_PROJECT_OPTIONS,
} from './questions';
import SubscenarioPicker from './SubscenarioPicker';
import { useResumeStore } from '@/store/resume-store';
import type {
  IntakeAnswers,
  AIIndustryYears,
  ResumeStructure,
} from '@/lib/schema/resume';

type FormState = {
  // 基本信息
  name: string;
  phone: string;
  email: string;
  school: string;
  major: string;
  graduation: string;
  // V3.1 段 0（顺序：项目（前置） → 大类 → AI 年限 → 高亮 → 结构）
  courseProjects: string[];
  pathwayScene: string;
  industryCategory: string;
  subScenarios: string[];
  aiIndustryYears: AIIndustryYears;
  highlightFields: string[];
  resumeStructure: ResumeStructure;
};

const initialState: FormState = {
  name: '',
  phone: '',
  email: '',
  school: '',
  major: '',
  graduation: '',
  courseProjects: [],
  pathwayScene: '',
  industryCategory: '',
  subScenarios: [],
  aiIndustryYears: '<6m',
  highlightFields: [],
  resumeStructure: 'blue-fresh',
};

/** AI 年限到 V2 workYears 的映射（demo 链路兼容；V3.2 三档） */
function deriveWorkYears(ai: AIIndustryYears): '0' | '<1' | '1-3' | '>3' {
  if (ai === '<6m') return '0';
  if (ai === '6m-1y') return '<1';
  return '1-3';  // 1y+ → V2 demo 走 1-3 档（中阶动词风格）
}

export default function IntakeForm() {
  const router = useRouter();
  const sourceInput = useResumeStore((s) => s.sourceInput);
  const setSourceInput = useResumeStore((s) => s.setSourceInput);
  const setResume = useResumeStore((s) => s.setResume);

  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<'feishu' | 'demo' | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [feishuResult, setFeishuResult] = useState<string | null>(null);

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

  const toggleArray = (
    key: 'subScenarios' | 'courseProjects' | 'highlightFields',
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
    if (!form.name.trim() || !form.school.trim()) return '请至少填姓名和毕业院校';
    if (form.courseProjects.length === 0) return '至少勾选 1 个课程项目';
    if (!form.industryCategory) return '请选 1 个行业大类';
    return null;
  }

  function buildPayload() {
    const answers: IntakeAnswers = {
      courseProjects: form.courseProjects,
      pathwayScene: form.pathwayScene || undefined,
      industryCategory: form.industryCategory,
      subScenarios: form.subScenarios,
      aiIndustryYears: form.aiIndustryYears,
      highlightFields: form.highlightFields,
      resumeStructure: form.resumeStructure,
      // demo 链路兼容
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

  async function handleSubmitFeishu() {
    const err = validate();
    if (err) return setError(err);

    const { answers, basicInfo } = buildPayload();
    setSourceInput(sourceInput.scenario, answers);
    setSubmitting(true);
    setSubmitMode('feishu');
    setError(null);
    setFeishuResult(null);

    try {
      const resp = await fetch('/api/export-feishu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: sourceInput.scenario,
          intakeAnswers: answers,
          basicInfo,
        }),
      });
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = (await resp.json()) as { mode?: string; record_id?: string; error?: string };
        if (!resp.ok) throw new Error(j.error ?? '导出失败');
        setFeishuResult(
          j.mode === 'feishu-direct' || j.mode === 'feishu-relay'
            ? `✅ 已写入飞书多维表格（${j.mode}, record_id: ${j.record_id ?? '?'}）`
            : `✅ ${j.mode}`
        );
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
        setFeishuResult('📥 已下载 JSON（飞书凭证未配置，老师可手动导入飞书多维表格）');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setSubmitting(false);
      setSubmitMode(null);
    }
  }

  async function handleSubmitDemo() {
    const err = validate();
    if (err) return setError(err);

    const { answers, basicInfo } = buildPayload();
    setSourceInput(sourceInput.scenario, answers);
    setSubmitting(true);
    setSubmitMode('demo');
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
      setSubmitMode(null);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 py-8 px-6">
      <header className="space-y-2">
        <p className="text-sm text-blue-600 font-medium">
          基本信息 + 5 题（V3.1）
        </p>
        <h1 className="text-2xl font-bold">告诉我你的项目、方向和偏好</h1>
        <p className="text-sm text-slate-500">
          后台 AI 工作流会基于你的选择生成<strong>简历内容片段</strong>，你可以粘到自己挑的模板里。
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

      {/* Q1 课程项目（最前） */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">1.</span>
          做过的项目（多选，*）
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

      {/* Q2 行业大类 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">2.</span>
          行业场景大类（单选 1 个，*）
        </h2>
        <div className="flex flex-wrap gap-2">
          {INDUSTRY_OPTIONS.map((cat) => {
            const selected = form.industryCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, industryCategory: cat, subScenarios: [] }))
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

      {/* Q2.5 AI 动态细分场景（选完大类自动出） */}
      {form.industryCategory && (
        <section className="space-y-3">
          <h2 className="font-semibold text-base">
            <span className="text-blue-600 mr-2">2b.</span>
            细分场景（AI 生成，多选 1-3 个）
          </h2>
          <SubscenarioPicker
            category={form.industryCategory}
            courseProjects={form.courseProjects}
            selected={form.subScenarios}
            onToggle={(name) => toggleArray('subScenarios', name, 3)}
          />
        </section>
      )}

      {/* Q3 AI 行业年限 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">3.</span>
          AI 行业年限
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        <p className="text-xs text-slate-500">
          后端工作流会根据年限自动调整动词风格（&lt;6m 偏执行；&gt;2y 偏管理）。**用过的工具**会自动写进生成的"个人优势"里，不用单独勾选。
        </p>
      </section>

      {/* Q4 高亮定制 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">4.</span>
          高亮定制（多选，简历里着重突出哪些）
        </h2>
        <div className="flex flex-wrap gap-2">
          {HIGHLIGHT_OPTIONS.map((field) => {
            const selected = form.highlightFields.includes(field);
            return (
              <button
                key={field}
                type="button"
                onClick={() => toggleArray('highlightFields', field)}
                className={`text-sm px-3 py-2 rounded-lg border transition text-left ${
                  selected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {field}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          后端会用 markdown 加粗（**xxx**）标记你勾的字段；后续可在查看页面再细化到具体哪句话。
        </p>
      </section>

      {/* Q5 简历结构偏好 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">
          <span className="text-blue-600 mr-2">5.</span>
          简历结构偏好（参考调性，6 选 1）
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STRUCTURE_OPTIONS.map((opt) => {
            const selected = form.resumeStructure === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, resumeStructure: opt.value }))}
                className={`text-sm px-3 py-3 rounded-lg border transition text-left ${
                  selected
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-[10px] text-slate-400">{opt.layout}</div>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{opt.hint}</div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          产品<strong>只生成内容片段</strong>，结构偏好让后端工作流知道用哪种调性写文字（正式 vs 清爽 vs 活泼）；最终模板你<strong>自己挑</strong>（可画 / 五百丁 / Word），把内容粘进去。
        </p>
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

      {/* 提交按钮：双轨 */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSubmitFeishu}
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
        >
          {submitting && submitMode === 'feishu'
            ? `导出中… 已用时 ${elapsedSec}s`
            : '✅ 提交并导出到飞书多维表格（主路径）'}
        </button>
        <button
          type="button"
          onClick={handleSubmitDemo}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:border-slate-400 disabled:bg-slate-100"
        >
          {submitting && submitMode === 'demo'
            ? `本地生成中… ${elapsedSec}s（约 200-300s）`
            : '🧪 本地 demo 生成（V2 链路：Claude 直接出简历 → 编辑器 → PDF）'}
        </button>
      </div>

      {submitting && submitMode === 'feishu' && (
        <div className="text-xs text-slate-500 space-y-1 bg-slate-50 border border-slate-200 rounded p-3">
          <p>📡 写入飞书多维表格中…</p>
          <p>没配凭证时会自动 fallback 下载 JSON 文件，老师手动粘到飞书。</p>
        </div>
      )}
      {submitting && submitMode === 'demo' && (
        <div className="text-xs text-slate-500 space-y-1 bg-slate-50 border border-slate-200 rounded p-3">
          <p>📡 调用本地 Claude CLI 生成简历…</p>
          <p className="font-mono">
            进度：
            {elapsedSec < 30
              ? '初始化检索...'
              : elapsedSec < 80
                ? 'Claude 正在思考...'
                : elapsedSec < 200
                  ? 'Claude 正在写项目段落...'
                  : elapsedSec < 350
                    ? 'Claude 正在润色 + 校验...'
                    : '已超出预期时长，可能 CLI 异常...'}
          </p>
        </div>
      )}
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

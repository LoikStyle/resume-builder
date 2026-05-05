'use client';

import { useEffect, useMemo, useState } from 'react';
import { INDUSTRIES } from '@/lib/industries';
import {
  COURSE_PROJECT_OPTIONS,
  PROJECT_DIRECTION_OPTIONS,
} from '@/components/intake/questions';
import { useApiConfigStore } from '@/store/api-config-store';

type Subscenario = {
  name: string;
  description: string;
  core_dimensions?: string[];
};

const ADMIN_TOKEN_KEY = 'resume:admin-token';

type PromptKind = 'main' | 'aesthetic';

const PROMPT_KIND_LABELS: Record<PromptKind, string> = {
  main: '主线（多模态 / 文本模型 / 混合）',
  aesthetic: '通用美学（实习 / 大厂固化）',
};

export default function AdminPromptPage() {
  const apiKey = useApiConfigStore((s) => s.apiKey);
  const baseUrl = useApiConfigStore((s) => s.baseUrl);
  const model = useApiConfigStore((s) => s.model);

  const [adminToken, setAdminToken] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [kind, setKind] = useState<PromptKind>('main');
  const [template, setTemplate] = useState('');
  const [origTemplate, setOrigTemplate] = useState('');
  const [loadingTpl, setLoadingTpl] = useState(false);

  const [category, setCategory] = useState(INDUSTRIES[0]?.name ?? '');
  const [direction, setDirection] = useState<string>(PROJECT_DIRECTION_OPTIONS[0]?.value ?? '多模态');
  const [subtags, setSubtags] = useState<string[]>([]);
  const [courseProjects, setCourseProjects] = useState<string[]>([]);

  const [previewing, setPreviewing] = useState(false);
  const [previewItems, setPreviewItems] = useState<Subscenario[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : '';
    if (cached) setAdminToken(cached);
  }, []);

  const currentIndustry = useMemo(
    () => INDUSTRIES.find((c) => c.name === category),
    [category]
  );

  useEffect(() => {
    setSubtags([]);
  }, [category]);

  async function loadKind(targetKind: PromptKind, token: string) {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/admin/prompt?kind=${targetKind}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (r.status === 401) throw new Error('admin token 错误');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as { template: string };
    return j.template;
  }

  async function handleAuth() {
    if (!adminToken) {
      setAuthError('先填 admin token');
      return;
    }
    setLoadingTpl(true);
    setAuthError(null);
    try {
      const tpl = await loadKind(kind, adminToken);
      setTemplate(tpl);
      setOrigTemplate(tpl);
      setAuthChecked(true);
      localStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoadingTpl(false);
    }
  }

  async function handleSwitchKind(target: PromptKind) {
    if (target === kind) return;
    if (template !== origTemplate) {
      const ok = window.confirm('当前 PE 有未保存改动，切换会丢失。继续？');
      if (!ok) return;
    }
    setLoadingTpl(true);
    try {
      const tpl = await loadKind(target, adminToken);
      setKind(target);
      setTemplate(tpl);
      setOrigTemplate(tpl);
      setSaveResult(null);
      setPreviewItems(null);
      setPreviewError(null);
    } catch (e) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : '切换失败' });
    } finally {
      setLoadingTpl(false);
    }
  }

  async function handlePreview() {
    if (!apiKey) {
      setPreviewError('缺 AIhubmix key——请先去 /resume/intake 右上角设置里填');
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    setPreviewItems(null);
    try {
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/admin/prompt/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
            'x-api-key': apiKey,
            'x-base-url': baseUrl,
            'x-model': model,
          },
          body: JSON.stringify({ template, category, direction, subtags, courseProjects }),
        }
      );
      const j = (await r.json()) as { subscenarios?: Subscenario[]; error?: string };
      if (!r.ok) {
        setPreviewError(j.error ?? `HTTP ${r.status}`);
        return;
      }
      setPreviewItems(j.subscenarios ?? []);
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : '预览失败');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSave() {
    if (template === origTemplate) {
      setSaveResult({ ok: false, msg: '无改动' });
      return;
    }
    setSaving(true);
    setSaveResult(null);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/admin/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ template, kind }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        setSaveResult({ ok: false, msg: j.error ?? `HTTP ${r.status}` });
        return;
      }
      setOrigTemplate(template);
      setSaveResult({ ok: true, msg: '✅ 已保存到服务器，下次生成立刻生效' });
    } catch (e) {
      setSaveResult({ ok: false, msg: e instanceof Error ? e.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold">PE 调试后台</h1>
          <p className="text-sm text-slate-500">输入 admin token 访问</p>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder="admin token"
            className="w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />
          {authError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {authError}
            </div>
          )}
          <button
            type="button"
            onClick={handleAuth}
            disabled={loadingTpl}
            className="w-full py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingTpl ? '加载中…' : '进入'}
          </button>
        </div>
      </main>
    );
  }

  const dirty = template !== origTemplate;

  return (
    <main className="min-h-screen px-6 py-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">PE 调试后台 — 细分场景生成</h1>
          <p className="text-xs text-slate-500 mt-1">
            占位符：{'{{CATEGORY}}'}、{'{{DIRECTION}}'}、{'{{SUBTAGS}}'}、{'{{COURSE_PROJECTS}}'}、{'{{TARGET_COUNT}}'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {dirty && <span className="text-amber-600 font-medium">● 未保存</span>}
          <a
            href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/intake`}
            className="text-blue-600 hover:underline"
          >
            ← 回 intake 页
          </a>
        </div>
      </header>

      <div className="mb-3 flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(Object.keys(PROMPT_KIND_LABELS) as PromptKind[]).map((k) => (
          <button
            key={k}
            type="button"
            disabled={loadingTpl}
            onClick={() => handleSwitchKind(k)}
            className={`text-xs px-3 py-1.5 rounded-md transition ${
              k === kind
                ? 'bg-white shadow-sm text-slate-900 font-medium'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {PROMPT_KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左：编辑器 + 输入 */}
        <div className="space-y-3">
          <section className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Prompt 模板</label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full h-[480px] text-xs font-mono px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
          </section>

          <section className="space-y-2 bg-slate-50 border border-slate-200 rounded p-3">
            <label className="text-sm font-medium text-slate-700">测试输入</label>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-slate-500">模型方向</span>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    className="mt-1 w-full text-sm px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    {PROJECT_DIRECTION_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-xs text-slate-500">行业</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full text-sm px-2 py-1.5 rounded border border-slate-300 bg-white"
                  >
                    {INDUSTRIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {currentIndustry && currentIndustry.subtags.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500">二级标签（多选）</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {currentIndustry.subtags.map((tag) => {
                      const sel = subtags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setSubtags((s) =>
                              s.includes(tag) ? s.filter((x) => x !== tag) : [...s, tag]
                            )
                          }
                          className={`text-xs px-2 py-0.5 rounded border ${
                            sel
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-500">课程项目（多选）</span>
                <div className="mt-1 flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                  {COURSE_PROJECT_OPTIONS.map((p) => {
                    const sel = courseProjects.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          setCourseProjects((s) =>
                            s.includes(p) ? s.filter((x) => x !== p) : [...s, p]
                          )
                        }
                        className={`text-xs px-2 py-0.5 rounded border ${
                          sel
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewing || !template}
              className="flex-1 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {previewing ? '预览中…（5-15s）' : '预览（用学生 AIhubmix key）'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex-1 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存到服务器'}
            </button>
          </div>

          {saveResult && (
            <div
              className={`text-xs p-2 rounded ${
                saveResult.ok
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {saveResult.msg}
            </div>
          )}
        </div>

        {/* 右：预览结果 */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-700">预览结果</h2>
          {previewError && (
            <div className="text-xs p-3 rounded bg-red-50 text-red-700 border border-red-200">
              {previewError}
            </div>
          )}
          {!previewError && !previewItems && (
            <div className="text-xs p-3 rounded bg-slate-50 text-slate-500 border border-slate-200">
              点左下「预览」用当前 prompt + 测试输入调一次 AIhubmix。结果只显示，不会保存。
            </div>
          )}
          {previewItems && previewItems.length === 0 && (
            <div className="text-xs p-3 rounded bg-amber-50 text-amber-700 border border-amber-200">
              模型返回 0 条
            </div>
          )}
          {previewItems && previewItems.length > 0 && (
            <div className="space-y-2 max-h-[80vh] overflow-y-auto pr-1">
              <p className="text-xs text-slate-500">共 {previewItems.length} 条</p>
              {previewItems.map((it, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded p-2.5 bg-white text-sm"
                >
                  <div className="font-medium">
                    [{i + 1}] {it.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{it.description}</div>
                  {it.core_dimensions && it.core_dimensions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {it.core_dimensions.map((d) => (
                        <span
                          key={d}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

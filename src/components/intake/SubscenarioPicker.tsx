'use client';

import { useEffect, useState } from 'react';

export type Subscenario = {
  name: string;
  description: string;
  core_dimensions?: string[]; // V3.2-fix4：4 个评测维度，用于学生简历"N 维度评测体系"量化
};

type Props = {
  category: string;                    // 选中的行业大类
  courseProjects: string[];            // V3.2 新增：学生勾选的课程项目，用于约束生成
  selected: string[];                  // 已勾选的细分场景 name
  onToggle: (name: string) => void;    // 勾选/取消（受 IntakeForm 控制 max 3）
};

export default function SubscenarioPicker({
  category,
  courseProjects,
  selected,
  onToggle,
}: Props) {
  const [items, setItems] = useState<Subscenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0); // 重试触发器
  // V3.2：除大类外，项目集合变化也触发重新生成
  // V3.2-fix3：删除 lastKeyRef（跟 Strict Mode 双调用冲突，导致首次挂载时第 2 次 effect 误跳过）
  // 直接靠 useEffect 的依赖系统——fetchKey 变化才重跑，Strict Mode 双调用第 2 次会再发 fetch
  const projectsKey = courseProjects.slice().sort().join('|');
  const fetchKey = `${category}::${projectsKey}::${retryNonce}`;

  useEffect(() => {
    if (!category) return;
    if (!courseProjects.length) return;

    // V3.2-fix3：500ms 防抖——React Strict Mode 双调用 + 用户快速切换 = 多次 fetch 互相 abort，
    // 最终全部失败。等 500ms 稳定后再发，Strict Mode 第一次的 cleanup 会取消 timer，第二次 effect 重新 schedule
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setItems([]);

    const debounce = setTimeout(() => {
      fetch('/api/subscenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, courseProjects }),
        signal: ctrl.signal,
      })
        .then(async (r) => {
          const j = (await r.json()) as { subscenarios?: Subscenario[]; error?: string };
          if (!r.ok) {
            setError(j.error ?? `HTTP ${r.status}`);
            return;
          }
          if (j.subscenarios && Array.isArray(j.subscenarios) && j.subscenarios.length > 0) {
            setItems(j.subscenarios);
          } else {
            setError(j.error ?? '未返回场景数据');
          }
        })
        .catch((e) => {
          if (e.name !== 'AbortError') setError(e.message ?? '请求失败');
        })
        .finally(() => setLoading(false));
    }, 500);

    return () => {
      clearTimeout(debounce);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  if (loading) {
    return (
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50/30">
        <p className="text-sm text-blue-700">
          ⏳ AI 正在为「{category}」+ 你勾的 {courseProjects.length} 个项目生成细分场景…
          <br />
          <span className="text-xs text-blue-500/70">通常 5-15 秒</span>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-dashed border-red-300 rounded-lg p-6 text-center bg-red-50/30">
        <p className="text-sm text-red-700">生成失败：{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRetryNonce((n) => n + 1); // 改 fetchKey 触发 useEffect
          }}
          className="mt-2 text-xs text-red-700 underline"
        >
          重试
        </button>
      </div>
    );
  }

  if (!items.length) {
    if (!courseProjects.length) {
      return (
        <div className="border-2 border-dashed border-amber-300 rounded-lg p-4 text-center bg-amber-50/30">
          <p className="text-sm text-amber-700">
            ⚠️ 你还没勾选课程项目（Q1）—— 先回上面勾选项目，AI 才能基于"你的项目类型"生成细分场景
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        AI 基于「{category}」+ 你勾的项目类型生成 {items.length} 个细分方向，勾 1-3 个（已选 {selected.length}/3）
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((it) => {
          const isSelected = selected.includes(it.name);
          const disabled = !isSelected && selected.length >= 3;
          return (
            <button
              key={it.name}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(it.name)}
              className={`text-left text-sm px-3 py-2.5 rounded-lg border transition ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : disabled
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-medium">{it.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{it.description}</div>
              {it.core_dimensions && it.core_dimensions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {it.core_dimensions.map((dim) => (
                    <span
                      key={dim}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {dim}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

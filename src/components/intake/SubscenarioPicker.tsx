'use client';

import { useEffect, useState } from 'react';
import { useApiConfigStore } from '@/store/api-config-store';

export type Subscenario = {
  name: string;
  description: string;
  core_dimensions?: string[];
};

type Props = {
  category: string;
  direction: string;
  subtags: string[];
  courseProjects: string[];
  selected: string[];
  onToggle: (name: string) => void;
  onOpenSettings: () => void;
  triggerNonce: number;
};

const SELECT_MAX = 5;

export default function SubscenarioPicker({
  category,
  direction,
  subtags,
  courseProjects,
  selected,
  onToggle,
  onOpenSettings,
  triggerNonce,
}: Props) {
  const apiKey = useApiConfigStore((s) => s.apiKey);
  const baseUrl = useApiConfigStore((s) => s.baseUrl);
  const model = useApiConfigStore((s) => s.model);

  const [items, setItems] = useState<Subscenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (triggerNonce === 0) return;
    if (!category) return;

    if (!apiKey) {
      setMissingKey(true);
      setError('请先在右上角【设置】里填 AIhubmix API key');
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setMissingKey(false);
    setItems([]);

    const debounce = setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/subscenarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-base-url': baseUrl,
          'x-model': model,
        },
        body: JSON.stringify({ category, direction, subtags, courseProjects }),
        signal: ctrl.signal,
      })
        .then(async (r) => {
          const j = (await r.json()) as {
            subscenarios?: Subscenario[];
            error?: string;
            missingKey?: boolean;
          };
          if (!r.ok) {
            setMissingKey(Boolean(j.missingKey));
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
    }, 300);

    return () => {
      clearTimeout(debounce);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerNonce, retryNonce]);

  if (triggerNonce === 0 && !loading) {
    if (!category) {
      return (
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50/30">
          <p className="text-sm text-slate-500">先选行业大类，再点上方按钮生成细分场景</p>
        </div>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center bg-blue-50/30">
        <p className="text-sm text-blue-700">
          AI 正在生成「{category}」的细分场景…
          <br />
          <span className="text-xs text-blue-500/70">通常 5-15 秒</span>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-dashed border-red-300 rounded-lg p-6 text-center bg-red-50/30 space-y-2">
        <p className="text-sm text-red-700">{error}</p>
        {missingKey ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            打开设置填 API key
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setRetryNonce((n) => n + 1);
            }}
            className="text-xs text-red-700 underline"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        AI 生成 {items.length} 个细分方向，勾 1-{SELECT_MAX} 个（已选 {selected.length}/{SELECT_MAX}）
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((it) => {
          const isSelected = selected.includes(it.name);
          const disabled = !isSelected && selected.length >= SELECT_MAX;
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

'use client';

import { useEffect, useState } from 'react';
import { useApiConfigStore } from '@/store/api-config-store';

type Props = {
  open: boolean;
  onClose: () => void;
};

const MODEL_PRESETS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1',
  'claude-3-5-haiku-latest',
  'claude-sonnet-4-5',
  'gemini-2.0-flash',
  'deepseek-chat',
];

export default function ApiKeyModal({ open, onClose }: Props) {
  const { apiKey, baseUrl, model, setApiKey, setBaseUrl, setModel } = useApiConfigStore();

  const [draftKey, setDraftKey] = useState(apiKey);
  const [draftBase, setDraftBase] = useState(baseUrl);
  const [draftModel, setDraftModel] = useState(model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (open) {
      setDraftKey(apiKey);
      setDraftBase(baseUrl);
      setDraftModel(model);
      setTestResult(null);
    }
  }, [open, apiKey, baseUrl, model]);

  if (!open) return null;

  async function handleTest() {
    if (!draftKey.trim()) {
      setTestResult({ ok: false, msg: '先填 API key' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch(`${(draftBase || 'https://aihubmix.com/v1').replace(/\/$/, '')}/models`, {
        headers: { Authorization: `Bearer ${draftKey.trim()}` },
      });
      if (r.ok) {
        setTestResult({ ok: true, msg: '✅ 连接成功，密钥可用' });
      } else if (r.status === 401) {
        setTestResult({ ok: false, msg: '❌ 401 鉴权失败：密钥无效或过期' });
      } else {
        setTestResult({ ok: false, msg: `❌ HTTP ${r.status}` });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: `❌ 连接失败：${e instanceof Error ? e.message : '未知'}` });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    setApiKey(draftKey);
    setBaseUrl(draftBase);
    setModel(draftModel);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">API 设置</h2>
          <p className="text-xs text-slate-500">
            填你的 AIhubmix API key，会保存在浏览器本地。生成细分场景时调用。
          </p>
        </header>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">API Key</span>
          <input
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="sk-xxx"
            className="mt-1 w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <a
            href="https://aihubmix.com"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-blue-600 hover:underline mt-1 inline-block"
          >
            没有 key？去 aihubmix.com 注册领取
          </a>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">Base URL</span>
          <input
            type="text"
            value={draftBase}
            onChange={(e) => setDraftBase(e.target.value)}
            placeholder="https://aihubmix.com/v1"
            className="mt-1 w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">模型</span>
          <input
            type="text"
            list="model-presets"
            value={draftModel}
            onChange={(e) => setDraftModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="mt-1 w-full text-sm px-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <datalist id="model-presets">
            {MODEL_PRESETS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <span className="text-[11px] text-slate-500 mt-1 inline-block">
            建议默认 gpt-4o-mini（快、便宜、中文够用）
          </span>
        </label>

        {testResult && (
          <div
            className={`text-xs p-2 rounded ${
              testResult.ok
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {testResult.msg}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex-1 py-2 rounded text-sm border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? '测试中…' : '测试连接'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 font-medium"
          >
            保存
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-xs text-slate-500 hover:text-slate-700"
        >
          取消
        </button>
      </div>
    </div>
  );
}

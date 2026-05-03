'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useResumeStore } from '@/store/resume-store';
import { ResumeSchema } from '@/lib/schema/resume';
import ResumeForm from './ResumeForm';
import PreviewPane from './PreviewPane';
import TemplatePicker from './TemplatePicker';

export default function EditorLayout() {
  const data = useResumeStore((s) => s.data);
  const template = useResumeStore((s) => s.template);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const setResume = useResumeStore((s) => s.setResume);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center space-y-4">
          <p className="text-slate-500">还没有简历草稿。</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            从头开始填写一份
          </Link>
        </div>
      </div>
    );
  }

  async function handleExportPdf() {
    setExporting(true);
    setExportError(null);
    try {
      const resp = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: data, template }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`导出失败 ${resp.status}: ${text.slice(0, 200)}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = `${data?.basic.name || 'resume'}_${template}.pdf`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="no-print h-14 bg-white border-b border-slate-200 px-4 flex items-center gap-3">
        <Link href="/" className="text-sm font-bold text-slate-900">
          AI 训练师简历生成器
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500">编辑器</span>

        <div className="ml-auto flex items-center gap-3">
          <TemplatePicker value={template} onChange={setTemplate} />
          <button
            type="button"
            onClick={() => {
              const r = ResumeSchema.safeParse(data);
              if (!r.success) {
                alert(`Schema 校验失败：\n${r.error.issues.map((i) => `· ${i.path.join('.')}：${i.message}`).join('\n')}`);
              } else {
                alert('Schema 校验通过 ✓');
              }
            }}
            className="text-xs px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            校验
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting}
            className="text-sm px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-300"
          >
            {exporting ? '导出中…' : '导出 PDF'}
          </button>
        </div>
      </header>

      {exportError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
          {exportError}
        </div>
      )}

      {/* 左表单 + 右预览 */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[45%] min-w-[420px] border-r border-slate-200 overflow-y-auto bg-slate-50">
          <div className="p-4">
            <ResumeForm data={data} onChange={setResume} />
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          <PreviewPane data={data} template={template} />
        </main>
      </div>
    </div>
  );
}

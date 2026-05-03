'use client';

import { useState } from 'react';
import type { Resume, TemplateKind } from '@/lib/schema/resume';
import DenseTemplate from '@/components/templates/DenseTemplate';
import LooseTemplate from '@/components/templates/LooseTemplate';
import StructuredTemplate from '@/components/templates/StructuredTemplate';

const templates: Record<TemplateKind, React.FC<{ data: Resume }>> = {
  dense: DenseTemplate,
  loose: LooseTemplate,
  structured: StructuredTemplate,
};

export default function PreviewPane({
  data,
  template,
}: {
  data: Resume;
  template: TemplateKind;
}) {
  const [zoom, setZoom] = useState(0.75);
  const Template = templates[template];

  return (
    <div className="h-full flex flex-col bg-slate-100">
      <div className="no-print flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white text-xs">
        <span className="text-slate-500">缩放</span>
        {[0.6, 0.75, 0.9, 1].map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZoom(z)}
            className={`px-2 py-1 rounded ${
              zoom === z ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
        <span className="ml-auto text-slate-400">A4 · 实时预览</span>
      </div>

      <div className="flex-1 overflow-auto py-6 flex justify-center">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            width: '210mm',
          }}
        >
          <Template data={data} />
        </div>
      </div>
    </div>
  );
}

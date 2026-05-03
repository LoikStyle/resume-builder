'use client';

import type { TemplateKind } from '@/lib/schema/resume';

const options: Array<{ value: TemplateKind; label: string; hint: string }> = [
  { value: 'dense', label: '密集型', hint: '一页 5-6 项' },
  { value: 'loose', label: '宽松型', hint: '一页 2-3 项' },
  { value: 'structured', label: '结构型', hint: '卡片化' },
];

export default function TemplatePicker({
  value,
  onChange,
}: {
  value: TemplateKind;
  onChange: (v: TemplateKind) => void;
}) {
  return (
    <div className="inline-flex items-center bg-slate-100 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-xs px-3 py-1.5 rounded-md transition ${
            value === opt.value
              ? 'bg-white text-slate-900 shadow-sm font-medium'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={opt.hint}
        >
          {opt.label}
          <span className="ml-1 text-slate-400 font-normal">{opt.hint}</span>
        </button>
      ))}
    </div>
  );
}

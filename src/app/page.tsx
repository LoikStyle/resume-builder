'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResumeStore } from '@/store/resume-store';

export default function HomePage() {
  const router = useRouter();
  const setSourceInput = useResumeStore((s) => s.setSourceInput);
  const [scenario, setScenario] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const examples = [
    '想投 AI 训练师，对小红书内容方向感兴趣',
    '想做评测方向，关注多模态文生图 / 视频质量评估',
    '偏标注 / 数据生产，想去做 RAG 知识库相关',
    '想投智能客服 Bad Case 分析方向',
  ];

  function handleNext() {
    if (!scenario.trim()) return;
    setSubmitting(true);
    setSourceInput(scenario.trim(), {
      roleDirection: 'mixed',
      sceneInterests: [],
      courseProjects: [],
      modelsTools: { 模型: [], 评测框架: [], 自动化工具: [], 标注方法: [] },
      roleInProject: '',
      highlights: [],
    });
    router.push('/intake');
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-blue-600 tracking-wide">
            AI 训练师简历生成器
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            一句话告诉我你想投的方向，<br />
            我帮你定制一份能直接投递的简历。
          </h1>
          <p className="text-slate-600">
            先用 30 秒描述你的求职意向，下一步会有 6 道题帮你梳理课程项目和量化亮点。
          </p>
        </header>

        <div className="space-y-3">
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="例如：想投 AI 训练师 / 评测岗，对小红书内容生成和多模态评测特别感兴趣……"
            className="w-full min-h-[140px] rounded-xl border border-slate-300 bg-white p-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={500}
          />

          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setScenario(ex)}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={!scenario.trim() || submitting}
          className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-base shadow-sm hover:bg-blue-700 active:bg-blue-800 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          下一步：填 6 道题 →
        </button>

        <p className="text-xs text-slate-400 text-center">
          数据全部保存在你的浏览器本地，关闭网页不会丢失草稿。
        </p>
      </div>
    </main>
  );
}

import type { Resume } from '@/lib/schema/resume';
import {
  ResumeHeader,
  BasicInfoBlock,
  EducationBlock,
  SelfEvaluationBlock,
  SkillsBlock,
  HonorsBlock,
  SectionTitle,
  groupByType,
  expTypeLabels,
  expTypeOrder,
} from './shared';

/**
 * 结构型模板：
 * - 三段分别渲：背景 / 行动 bullet / 结果量化高亮
 * - 项目卡片化，边框区隔
 * - 适合大厂应届投递、要凸显量化
 */
export default function StructuredTemplate({ data }: { data: Resume }) {
  const groups = groupByType(data.experiences);

  return (
    <div className="a4-page text-[11pt]">
      <ResumeHeader basic={data.basic} />
      <BasicInfoBlock basic={data.basic} />
      <EducationBlock education={data.education} />

      {expTypeOrder.map((t) => {
        const list = groups[t];
        if (!list?.length) return null;
        return (
          <section key={t} className="experience-block">
            <SectionTitle>{expTypeLabels[t]}</SectionTitle>
            {list.map((e) => (
              <div
                key={e.id}
                className="experience-block mb-2.5 border border-slate-200 rounded-md p-2.5"
              >
                <div className="flex justify-between text-sm font-semibold text-slate-900 mb-1.5">
                  <span>
                    {e.org}
                    <span className="text-slate-600 font-normal ml-2">· {e.role}</span>
                  </span>
                  {e.period && <span className="text-slate-500 font-normal">{e.period}</span>}
                </div>

                <div className="space-y-1.5 text-[10.5pt]">
                  {e.background && (
                    <div>
                      <span className="text-xs font-bold text-slate-500 mr-2">背景</span>
                      <span className="text-slate-700">{e.background}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-bold text-slate-500 mr-2">行动</span>
                    <ul className="inline-block align-top list-disc pl-5 text-slate-700">
                      {e.actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 rounded px-2 py-1">
                    <span className="text-xs font-bold text-blue-700 mr-2">结果</span>
                    <span className="text-slate-800 font-medium">
                      {e.results.join('；')}
                    </span>
                  </div>
                </div>

                {(e.modelsUsed?.length || e.toolsUsed?.length) && (
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[9pt]">
                    {[...(e.modelsUsed ?? []), ...(e.toolsUsed ?? [])].map((m) => (
                      <span
                        key={m}
                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        );
      })}

      <SkillsBlock skills={data.skills} />
      <SelfEvaluationBlock text={data.selfEvaluation} />
      <HonorsBlock honors={data.honors} />
    </div>
  );
}

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
 * 密集型模板：
 * - 只渲染 actions[]（单行 bullet）+ results 量化
 * - 一页能放 5-6 项经历
 * - 适合项目多想全面展示的学生
 */
export default function DenseTemplate({ data }: { data: Resume }) {
  const groups = groupByType(data.experiences);

  return (
    <div className="a4-page text-[11pt] leading-snug">
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
              <div key={e.id} className="experience-block mb-2.5">
                <div className="flex justify-between text-sm font-semibold text-slate-900">
                  <span>
                    {e.org}
                    <span className="text-slate-600 font-normal ml-2">· {e.role}</span>
                  </span>
                  {e.period && <span className="text-slate-500 font-normal">{e.period}</span>}
                </div>
                <ul className="mt-0.5 space-y-0.5 text-[10.5pt] text-slate-700 list-disc pl-5">
                  {e.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                  {e.results.map((r, i) => (
                    <li key={`r${i}`} className="font-medium text-blue-700">
                      {r}
                    </li>
                  ))}
                </ul>
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

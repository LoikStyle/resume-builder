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
 * 宽松型模板：
 * - 把 background + actions + results 合成连贯叙事
 * - 一页 2-3 项经历，留白多
 * - 适合项目少但想深度展开
 */
export default function LooseTemplate({ data }: { data: Resume }) {
  const groups = groupByType(data.experiences);

  return (
    <div className="a4-page text-[11pt] leading-relaxed">
      <ResumeHeader basic={data.basic} />
      <BasicInfoBlock basic={data.basic} />
      <EducationBlock education={data.education} />

      {expTypeOrder.map((t) => {
        const list = groups[t];
        if (!list?.length) return null;
        return (
          <section key={t} className="experience-block">
            <SectionTitle>{expTypeLabels[t]}</SectionTitle>
            {list.map((e) => {
              const narrative = [
                e.background,
                ...e.actions.map((a) => a.replace(/^[\s·-]+/, '')),
              ].join('；') + '。';
              return (
                <div key={e.id} className="experience-block mb-3.5">
                  <div className="flex justify-between text-sm font-semibold text-slate-900 mb-1">
                    <span>
                      {e.org}
                      <span className="text-slate-600 font-normal ml-2">· {e.role}</span>
                    </span>
                    {e.period && <span className="text-slate-500 font-normal">{e.period}</span>}
                  </div>
                  <p className="text-[11pt] text-slate-700 leading-7 mb-1">{narrative}</p>
                  <p className="text-[10.5pt] text-blue-700 font-medium leading-6">
                    {e.results.join('；')}。
                  </p>
                </div>
              );
            })}
          </section>
        );
      })}

      <SkillsBlock skills={data.skills} />
      <SelfEvaluationBlock text={data.selfEvaluation} />
      <HonorsBlock honors={data.honors} />
    </div>
  );
}

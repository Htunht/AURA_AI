import type { Evaluation } from '../../types/evaluation'
import type { EvaluationRubric } from '../../types/rubric'
import { Progress } from '../ui/Progress'

type ScreeningCriteriaProps = {
  evaluation: Evaluation
  rubric?: EvaluationRubric
}

export function ScreeningCriteria({ evaluation, rubric }: ScreeningCriteriaProps) {
  return (
    <section aria-labelledby="criteria-title">
      <div className="mb-4">
        <h2 id="criteria-title" className="m-0 text-lg font-semibold text-depth">Evaluation criteria</h2>
        <p className="mb-0 mt-1 text-xs text-aura-text-muted">Weighted assessment against the role’s configured rubric.</p>
      </div>
      <div className="grid gap-3">
        {evaluation.criterionScores.map((criterion) => {
          const rubricCriterion = rubric?.criteria.find((item) => item.key === criterion.criterionKey)
          return (
            <article className="rounded-aura-sm border border-harbor/10 bg-white p-4" key={criterion.criterionKey}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div><h3 className="m-0 text-sm font-semibold text-depth">{rubricCriterion?.name ?? criterion.name}</h3><p className="mb-0 mt-1 text-xs text-aura-text-muted">Weight {criterion.weight}% · {criterion.evidence.length} evidence item{criterion.evidence.length === 1 ? '' : 's'}</p></div>
                <span className="whitespace-nowrap text-sm font-bold text-depth">{Math.round(criterion.score)} / 100</span>
              </div>
              <Progress value={criterion.score} />
              <p className="mb-0 mt-3 text-sm leading-6 text-aura-text-secondary">{criterion.rationale}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

import type { EvaluationChallenge } from '../../types/evaluationChallenge'
import type { FinalEvaluation } from '../../types/finalEvaluation'
import { Card } from '../ui/Card'

export function EvaluationDataQuality({ evaluation, challenges }: { evaluation: FinalEvaluation; challenges: EvaluationChallenge[] }) {
  const low = evaluation.questionAssessments.filter((item) => item.confidence === 'LOW').length
  const unmapped = evaluation.questionAssessments.filter((item) => item.reviewReasons.includes('TRANSCRIPT_MAPPING_UNCERTAIN')).length
  const unassessedMust = evaluation.competencyAssessments.filter((item) => item.importance === 'MUST_HAVE' && item.assessmentState === 'NOT_ASSESSED').length
  const open = challenges.filter((item) => item.status === 'OPEN').length
  const items = [`Transcript coverage: ${evaluation.assessedWeightPercent}% weighted competencies assessed`, `Question mapping: ${unmapped} uncertain`, `Low-confidence assessments: ${low}`, `Unassessed must-have competencies: ${unassessedMust}`, `Open evidence challenges: ${open}`]
  return <Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Data quality</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{low || unmapped || unassessedMust || open ? 'Data quality needs review.' : 'No critical data-quality issue is open.'}</p><ul className="mb-0 mt-3 grid gap-2 pl-5 text-xs leading-5 text-aura-text-muted">{items.map((item) => <li key={item}>{item}</li>)}</ul></Card>
}

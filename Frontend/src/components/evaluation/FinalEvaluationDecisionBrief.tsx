import type { EvaluationChallenge } from '../../types/evaluationChallenge'
import type { FinalEvaluation } from '../../types/finalEvaluation'
import type { FinalEvaluationReadiness } from '../../utils/finalEvaluationReadiness'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const recommendationLabels = {
  ADVANCE: 'Advance',
  HOLD_FOR_REVIEW: 'Hold for review',
  DO_NOT_ADVANCE: 'Do not advance',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
} as const

function getBlockingGuidance(evaluation: FinalEvaluation, challenges: EvaluationChallenge[]) {
  const guidance: string[] = []
  const openChallenges = challenges.filter((item) => item.status === 'OPEN').length
  const unassessedCompetencies = evaluation.competencyAssessments.filter((item) => item.assessmentState === 'NOT_ASSESSED').length

  if (evaluation.assessedWeightPercent < 70) guidance.push(`${unassessedCompetencies || 'Some'} competencies need stronger evidence.`)
  if (openChallenges) guidance.push(`Resolve ${openChallenges} open evidence ${openChallenges === 1 ? 'challenge' : 'challenges'}.`)
  if (evaluation.dataQualityIssues.length && evaluation.systemRecommendation === 'INSUFFICIENT_EVIDENCE') guidance.push('Resolve the evidence-quality issues.')
  if (!evaluation.systemScoreLocked || !evaluation.systemRecommendationLocked) guidance.push('Review the scoring audit information.')
  return guidance
}

export function FinalEvaluationDecisionBrief({ evaluation, readiness, challenges }: { evaluation: FinalEvaluation; readiness: FinalEvaluationReadiness; challenges: EvaluationChallenge[] }) {
  const decided = evaluation.status === 'DECIDED'
  const ready = readiness.readyForDecision
  const guidance = getBlockingGuidance(evaluation, challenges)
  const scoreAvailable = evaluation.weightedEvidenceScore !== undefined && evaluation.assessedWeightPercent >= 70

  return <Card className="overflow-hidden border-harbor/20">
    <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone={decided || ready ? 'success' : 'warning'}>{decided ? 'Decision recorded' : ready ? 'Ready for decision' : 'Review required'}</Badge>
        <span className="text-xs text-aura-text-muted">Evaluation v{evaluation.version}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-marine">System recommendation</p>
          <h2 className="mb-0 mt-1 text-2xl font-semibold tracking-tight text-depth">{recommendationLabels[evaluation.systemRecommendation]}</h2>
        </div>
        <p className="m-0 text-lg font-semibold text-harbor">{scoreAvailable ? `${evaluation.weightedEvidenceScore}/100` : 'Score unavailable'}</p>
      </div>

      <p className="mb-0 mt-3 max-w-4xl text-sm leading-6 text-aura-text-secondary">{evaluation.systemRecommendationRationale}</p>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-harbor/10 pt-4">
        <div><dt className="text-xs text-aura-text-muted">Coverage</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{evaluation.assessedWeightPercent}%</dd></div>
        <div><dt className="text-xs text-aura-text-muted">Must-haves</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{evaluation.mustHavePassed}/{evaluation.mustHaveTotal} passed</dd></div>
        <div><dt className="text-xs text-aura-text-muted">Confidence</dt><dd className="mb-0 mt-1 text-sm font-semibold capitalize text-depth">{evaluation.overallConfidence.toLocaleLowerCase()}</dd></div>
      </dl>
    </div>

    {!decided ? <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 sm:px-6 ${ready ? 'border-aura-success/15 bg-aura-success-soft/45' : 'border-aura-warning/15 bg-aura-warning-soft/50'}`}>
      {ready
        ? <p className="m-0 text-sm font-semibold text-depth">Human decision required</p>
        : <ul className="m-0 grid gap-1 pl-5 text-sm text-aura-text-secondary">{guidance.length ? guidance.map((item) => <li key={item}>{item}</li>) : <li>Review the evidence before recording a decision.</li>}</ul>}
      <a className="text-sm font-semibold text-harbor underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" href={ready ? '#final-human-decision' : '#evaluation-evidence'}>{ready ? 'Record decision' : 'Review evidence'}</a>
    </div> : null}
  </Card>
}

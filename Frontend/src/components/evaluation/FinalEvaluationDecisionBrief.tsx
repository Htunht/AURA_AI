import { AlertTriangle, ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react'
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

  if (evaluation.assessedWeightPercent < 70) guidance.push(`${unassessedCompetencies || 'Some'} competencies need stronger evidence before a decision can be recorded.`)
  if (openChallenges) guidance.push(`Resolve ${openChallenges} open evidence ${openChallenges === 1 ? 'challenge' : 'challenges'}.`)
  if (evaluation.dataQualityIssues.length && evaluation.systemRecommendation === 'INSUFFICIENT_EVIDENCE') guidance.push('Review the unresolved evidence-quality issues.')
  if (!evaluation.systemScoreLocked || !evaluation.systemRecommendationLocked) guidance.push('The scoring audit information needs review.')
  return guidance
}

export function FinalEvaluationDecisionBrief({ evaluation, readiness, challenges }: { evaluation: FinalEvaluation; readiness: FinalEvaluationReadiness; challenges: EvaluationChallenge[] }) {
  const decided = evaluation.status === 'DECIDED'
  const ready = readiness.readyForDecision
  const guidance = getBlockingGuidance(evaluation, challenges)
  const scoreAvailable = evaluation.weightedEvidenceScore !== undefined && evaluation.assessedWeightPercent >= 70
  const status = decided ? 'Final decision recorded' : ready ? 'Ready for final decision' : 'Evidence review required'
  const statusTone = decided || ready ? 'success' : 'warning'
  const StatusIcon = decided || ready ? CheckCircle2 : AlertTriangle

  return <Card className="overflow-hidden border-harbor/20">
    <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone}>{status}</Badge>
          <span className="text-xs text-aura-text-muted">Evaluation v{evaluation.version} · Published rubric v{evaluation.rubricVersion}</span>
        </div>
        <p className="mb-0 mt-6 text-xs font-bold uppercase tracking-[0.14em] text-marine">AURA recommendation</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
          <h2 className="m-0 text-2xl font-semibold tracking-tight text-depth sm:text-3xl">{recommendationLabels[evaluation.systemRecommendation]}</h2>
          <p className="m-0 text-sm font-semibold text-harbor">{scoreAvailable ? `${evaluation.weightedEvidenceScore} / 100 evidence score` : 'Evidence score unavailable'}</p>
        </div>
        <p className="mb-0 mt-4 max-w-3xl text-sm leading-6 text-aura-text-secondary">{evaluation.systemRecommendationRationale}</p>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-aura-sm border border-harbor/10 bg-harbor/10 sm:grid-cols-3">
          <div className="bg-white px-4 py-3"><dt className="text-xs text-aura-text-muted">Evidence coverage</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{readiness.assessedCompetencyCount} of {readiness.competencyCount} competencies · {evaluation.assessedWeightPercent}%</dd></div>
          <div className="bg-white px-4 py-3"><dt className="text-xs text-aura-text-muted">Must-have requirements</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{evaluation.mustHavePassed} of {evaluation.mustHaveTotal} passed</dd></div>
          <div className="bg-white px-4 py-3"><dt className="text-xs text-aura-text-muted">Evidence confidence</dt><dd className="mb-0 mt-1 text-sm font-semibold capitalize text-depth">{evaluation.overallConfidence.toLocaleLowerCase()}</dd></div>
        </dl>
      </div>

      <div className={`border-t p-5 sm:p-7 lg:border-l lg:border-t-0 ${ready || decided ? 'border-aura-success/15 bg-aura-success-soft/50' : 'border-aura-warning/15 bg-aura-warning-soft/55'}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-aura-xs"><StatusIcon className={ready || decided ? 'text-aura-success' : 'text-aura-warning'} size={20} aria-hidden="true" /></div>
        <h3 className="mb-0 mt-4 text-lg font-semibold text-depth">{decided ? 'Decision complete' : ready ? 'Your decision is next' : 'What needs attention'}</h3>
        {decided ? <p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">The authorized human outcome is recorded below with its audit reason.</p> : ready ? <p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">The evidence trail is ready. Review AURA’s rationale, then record the authorized human outcome.</p> : <ul className="mb-0 mt-3 grid gap-2 pl-5 text-sm leading-6 text-aura-text-secondary">{guidance.length ? guidance.map((item) => <li key={item}>{item}</li>) : <li>Review the evidence details below before recording an outcome.</li>}</ul>}
        {!decided ? <a className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-harbor underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" href={ready ? '#final-human-decision' : '#evaluation-evidence'}>{ready ? 'Record final decision' : 'Review evidence issues'}<ArrowRight size={15} aria-hidden="true" /></a> : null}
        <div className="mt-6 flex gap-2 border-t border-harbor/10 pt-4 text-xs leading-5 text-aura-text-muted"><LockKeyhole className="mt-0.5 shrink-0 text-marine" size={14} aria-hidden="true" /><span>AURA’s result is locked and advisory. An authorized human remains responsible for the final decision.</span></div>
      </div>
    </div>
  </Card>
}

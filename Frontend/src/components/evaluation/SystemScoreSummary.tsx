import type { FinalEvaluation } from '../../types/finalEvaluation'
import { Card } from '../ui/Card'

export function SystemScoreSummary({ evaluation }: { evaluation: FinalEvaluation }) {
  return <Card className="p-5"><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">System evidence score</p><p className="mb-0 mt-2 text-3xl font-bold tracking-tight text-depth">{evaluation.weightedEvidenceScore === undefined ? 'Unavailable' : `${evaluation.weightedEvidenceScore} / 100`}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-aura-text-muted">Assessed coverage</dt><dd className="mb-0 mt-1 font-semibold text-depth">{evaluation.assessedWeightPercent}%</dd></div><div><dt className="text-xs text-aura-text-muted">Evidence confidence</dt><dd className="mb-0 mt-1 font-semibold text-depth">{evaluation.overallConfidence.toLocaleLowerCase()}</dd></div></dl><p className="mb-0 mt-4 border-t border-harbor/10 pt-3 text-xs leading-5 text-aura-text-muted">Calculated from job-related evidence using published rubric version {evaluation.rubricVersion}. The score is locked.</p></Card>
}

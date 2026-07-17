import type { FinalEvaluation } from '../../types/finalEvaluation'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const label = { ADVANCE: 'Advance', HOLD_FOR_REVIEW: 'Hold for review', DO_NOT_ADVANCE: 'Do not advance', INSUFFICIENT_EVIDENCE: 'Insufficient evidence' } as const
export function SystemRecommendationCard({ evaluation }: { evaluation: FinalEvaluation }) {
  return <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="m-0 text-base font-semibold text-depth">System recommendation</h2><Badge tone={evaluation.systemRecommendation === 'ADVANCE' ? 'success' : evaluation.systemRecommendation === 'DO_NOT_ADVANCE' ? 'neutral' : 'warning'}>{label[evaluation.systemRecommendation]}</Badge></div><p className="mb-0 mt-3 text-sm leading-6 text-aura-text-secondary">{evaluation.systemRecommendationRationale}</p><p className="mb-0 mt-3 text-xs font-semibold text-harbor">System recommendation is locked.</p></Card>
}

import type { FinalEvaluation } from '../../types/finalEvaluation'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function MustHaveGateSummary({ evaluation }: { evaluation: FinalEvaluation }) {
  const mustHaves = evaluation.competencyAssessments.filter((item) => item.importance === 'MUST_HAVE')
  return <Card className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="m-0 text-base font-semibold text-depth">Must-have requirements</h2><span className="text-sm font-semibold text-harbor">{evaluation.mustHavePassed} of {evaluation.mustHaveTotal} passed</span></div><div className="mt-4 grid gap-2">{mustHaves.map((item) => { const status = item.assessmentState === 'NOT_ASSESSED' ? 'Not assessed' : item.requiresHumanReview && item.confidence === 'LOW' ? 'Needs data review' : item.gatePassed ? 'Passed' : 'Below required rating'; return <div className="flex items-center justify-between gap-3 rounded-aura-sm bg-frost/70 px-3 py-2" key={item.id}><span className="text-sm font-medium text-depth">{item.label}</span><Badge tone={status === 'Passed' ? 'success' : status === 'Below required rating' ? 'neutral' : 'warning'}>{status}</Badge></div> })}</div></Card>
}

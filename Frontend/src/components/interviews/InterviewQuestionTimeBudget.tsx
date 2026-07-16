import type { InterviewQuestionSetReadiness } from '../../utils/interviewQuestionSetReadiness'
import { Card } from '../ui/Card'
import { Progress } from '../ui/Progress'

export function InterviewQuestionTimeBudget({ durationMinutes, readiness }: { durationMinutes: number; readiness: InterviewQuestionSetReadiness }) {
  const reserved = Math.max(0, durationMinutes - readiness.estimatedMinutes)
  return <Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Time budget</h2><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><p className="m-0 text-2xl font-bold text-depth">{durationMinutes}</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">Interview</p></div><div><p className="m-0 text-2xl font-bold text-depth">{readiness.estimatedMinutes}</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">Question plan</p></div><div><p className="m-0 text-2xl font-bold text-depth">{reserved}</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">Reserved</p></div></div><div className="mt-4"><Progress value={(readiness.estimatedMinutes / Math.max(1, readiness.availableMinutes)) * 100} /><p className="mb-0 mt-2 text-xs text-aura-text-muted">{readiness.estimatedMinutes} of {readiness.availableMinutes} available question minutes</p></div>{readiness.estimatedMinutes > readiness.availableMinutes ? <p className="mb-0 mt-3 text-sm font-semibold text-aura-danger">The question plan exceeds the available interview time.</p> : null}</Card>
}

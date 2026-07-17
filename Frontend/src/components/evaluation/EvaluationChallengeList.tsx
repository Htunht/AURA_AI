import type { EvaluationChallenge } from '../../types/evaluationChallenge'
import type { UserRole } from '../../types/role'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function EvaluationChallengeList({ challenges, actorRole, onResolve, onDismiss }: { challenges: EvaluationChallenge[]; actorRole: UserRole; onResolve: (challengeId: string) => void; onDismiss: (challengeId: string) => void }) {
  if (!challenges.length) return <Card className="p-5 text-sm text-aura-text-secondary">No evidence challenges have been recorded.</Card>
  return <div className="grid gap-3">{challenges.map((challenge) => <Card className="p-5" key={challenge.id}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-depth">{challenge.reason.replaceAll('_', ' ').toLocaleLowerCase()}</h3><Badge tone={challenge.status === 'OPEN' ? 'warning' : challenge.status === 'RESOLVED' ? 'success' : 'neutral'}>{challenge.status.toLocaleLowerCase()}</Badge></div><p className="mb-0 mt-3 text-sm leading-6 text-aura-text-secondary">{challenge.explanation}</p><p className="mb-0 mt-2 text-xs text-aura-text-muted">Opened by {challenge.createdBy} · {challenge.questionAssessmentIds.length} question · {challenge.transcriptSegmentIds.length} transcript segment</p>{challenge.status === 'OPEN' && (actorRole === 'RECRUITER' || actorRole === 'HIRING_MANAGER') ? <div className="mt-4 flex gap-2"><Button className="h-9" variant="secondary" onClick={() => onResolve(challenge.id)}>Mark corrected</Button><Button className="h-9" variant="ghost" onClick={() => onDismiss(challenge.id)}>Dismiss</Button></div> : null}{challenge.resolutionNote ? <p className="mb-0 mt-3 rounded-aura-sm bg-frost p-3 text-xs text-aura-text-secondary">Resolution: {challenge.resolutionNote}</p> : null}</Card>)}</div>
}

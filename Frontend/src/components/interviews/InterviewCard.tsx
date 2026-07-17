import { Link } from 'react-router-dom'
import type { InterviewListItem } from '../../store/demoSelectors'
import { selectInterviewSessionOperationalStatus } from '../../store/demoSelectors'
import { useDemoStore } from '../../hooks/useDemoStore'
import { formatInterviewDate, formatInterviewMode, formatInterviewStatus, formatInterviewTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function InterviewCard({ item, confirmedLabel = false }: { item: InterviewListItem; confirmedLabel?: boolean }) {
  const { state } = useDemoStore(); const { interview, candidate, job } = item; const session = selectInterviewSessionOperationalStatus(state, interview.id)
  const action = session === 'READY' ? { label: 'Start session', path: `/interviews/${interview.id}/session` } : session === 'IN_PROGRESS' || session === 'PAUSED' ? { label: 'Resume', path: `/interviews/${interview.id}/session` } : session === 'COMPLETED' ? { label: 'Summary', path: `/interviews/${interview.id}/session` } : { label: 'View', path: `/interviews/${interview.id}` }
  return <Card className="p-4 shadow-none"><div className="flex items-start justify-between gap-3"><div><h3 className="m-0 text-base font-semibold text-depth"><Link className="text-inherit no-underline hover:text-marine" to={`/interviews/${interview.id}`}>{candidate.fullName}</Link></h3><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{job.title}</p></div><Badge tone={interview.status === 'COMPLETED' ? 'success' : interview.status === 'CANCELLED' ? 'neutral' : 'accent'}>{confirmedLabel ? 'Scheduled' : formatInterviewStatus(interview.status)}</Badge></div><div className="mt-4 grid gap-2 text-sm text-aura-text-secondary"><p className="m-0"><strong className="font-semibold text-depth">{formatInterviewDate(interview.scheduledStart)}</strong> · {formatInterviewTime(interview.scheduledStart)}–{formatInterviewTime(interview.scheduledEnd)}</p><p className="m-0">{formatInterviewMode(interview.mode ?? 'VIDEO')} · {interview.interviewers.map((person) => person.name).join(', ')}</p></div><div className="mt-4 flex justify-end"><Link className="inline-flex h-8 items-center rounded-aura-sm px-2 text-sm font-semibold text-harbor no-underline hover:bg-glacier/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={action.path}>{action.label}</Link></div></Card>
}

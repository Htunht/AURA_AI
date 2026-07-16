import { Link } from 'react-router-dom'
import type { InterviewListItem } from '../../store/demoSelectors'
import { formatInterviewDate, formatInterviewMode, formatInterviewStatus, formatInterviewTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

export function InterviewCard({ item }: { item: InterviewListItem }) {
  const { interview, candidate, job } = item
  return <Card className="grid gap-4 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="m-0 text-base font-semibold text-depth">{candidate.fullName}</h3><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{job.title}</p></div><Badge tone={interview.status === 'COMPLETED' ? 'success' : interview.status === 'CANCELLED' ? 'neutral' : 'accent'}>{formatInterviewStatus(interview.status)}</Badge></div><dl className="grid grid-cols-2 gap-3 border-y border-harbor/10 py-3"><div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Schedule</dt><dd className="mb-0 mt-1 text-sm font-semibold text-depth">{formatInterviewDate(interview.scheduledStart)} · {formatInterviewTime(interview.scheduledStart)}–{formatInterviewTime(interview.scheduledEnd)}</dd><dd className="m-0 text-xs text-aura-text-muted">{interview.timezone}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Mode</dt><dd className="mb-0 mt-1 text-sm text-depth">{formatInterviewMode(interview.mode ?? 'VIDEO')}</dd></div><div><dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Interviewers</dt><dd className="mb-0 mt-1 text-sm text-depth">{interview.interviewers.map((person) => person.name).join(', ')}</dd></div></dl><Link className="text-sm font-semibold text-harbor no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/interviews/${interview.id}`}>View interview</Link></Card>
}

import { Link } from 'react-router-dom'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { InterviewListItem } from '../../store/demoSelectors'
import { selectInterviewSessionOperationalStatus } from '../../store/demoSelectors'
import { formatInterviewDate, formatInterviewMode, formatInterviewStatus, formatInterviewTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'

function tone(status: InterviewListItem['interview']['status']) { return status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'warning' : status === 'CANCELLED' ? 'neutral' : 'accent' }

function actionForSession(interviewId: string, session: string) {
  if (session === 'READY') return { label: 'Start session', path: `/interviews/${interviewId}/session` }
  if (session === 'IN_PROGRESS' || session === 'PAUSED') return { label: 'Resume', path: `/interviews/${interviewId}/session` }
  if (session === 'COMPLETED') return { label: 'Summary', path: `/interviews/${interviewId}/session` }
  return { label: 'View', path: `/interviews/${interviewId}` }
}

export function InterviewTable({ items, confirmedLabel = false }: { items: InterviewListItem[]; confirmedLabel?: boolean }) {
  const { state } = useDemoStore()
  return <div className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs"><table className="w-full border-collapse text-left text-sm"><thead className="bg-frost/80 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Date and time</th><th className="px-4 py-3">Interview team</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-harbor/10">{items.map(({ interview, candidate, job }) => { const session = selectInterviewSessionOperationalStatus(state, interview.id); const action = actionForSession(interview.id, session); return <tr key={interview.id} className="hover:bg-glacier/[0.07]"><td className="px-4 py-3.5 align-top"><Link className="font-semibold text-depth no-underline hover:text-marine" to={`/interviews/${interview.id}`}>{candidate.fullName}</Link><span className="mt-1 block text-xs text-aura-text-muted">{job.title} · {formatInterviewMode(interview.mode ?? 'VIDEO')}</span></td><td className="whitespace-nowrap px-4 py-3.5 align-top"><span className="font-semibold text-depth">{formatInterviewDate(interview.scheduledStart)}</span><span className="mt-1 block text-xs text-aura-text-secondary">{formatInterviewTime(interview.scheduledStart)}–{formatInterviewTime(interview.scheduledEnd)}</span></td><td className="max-w-64 px-4 py-3.5 align-top text-xs leading-5 text-aura-text-secondary">{interview.interviewers.map((person) => person.name).join(', ')}</td><td className="px-4 py-3.5 align-top"><Badge tone={tone(interview.status)}>{confirmedLabel ? 'Scheduled' : formatInterviewStatus(interview.status)}</Badge></td><td className="px-4 py-3.5 text-right align-top"><Link className="inline-flex h-8 items-center rounded-aura-sm px-2 text-sm font-semibold text-harbor no-underline hover:bg-glacier/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={action.path}>{action.label}</Link></td></tr> })}</tbody></table></div>
}

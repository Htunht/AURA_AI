import { Link } from 'react-router-dom'
import type { InterviewListItem } from '../../store/demoSelectors'
import { formatInterviewDate, formatInterviewMode, formatInterviewStatus, formatInterviewTime } from '../../utils/helpers'
import { Badge } from '../ui/Badge'

function tone(status: InterviewListItem['interview']['status']) {
  if (status === 'SCHEDULED') return 'accent'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'COMPLETED') return 'success'
  return 'neutral'
}

export function InterviewTable({ items, confirmedLabel = false }: { items: InterviewListItem[]; confirmedLabel?: boolean }) {
  return <div className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs"><table className="w-full border-collapse text-left text-sm"><thead className="bg-frost/80 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted"><tr><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Applied role</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Interviewers</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-harbor/10">{items.map(({ interview, candidate, job }) => <tr key={interview.id} className="hover:bg-glacier/[0.07]"><td className="px-4 py-4 align-top"><strong className="font-semibold text-depth">{candidate.fullName}</strong><span className="mt-1 block text-xs text-aura-text-muted">{candidate.email}</span></td><td className="px-4 py-4 align-top font-medium text-depth">{job.title}</td><td className="px-4 py-4 align-top"><span className="font-semibold text-depth">{formatInterviewDate(interview.scheduledStart)}</span><span className="mt-1 block text-xs text-aura-text-secondary">{formatInterviewTime(interview.scheduledStart)}–{formatInterviewTime(interview.scheduledEnd)} · {interview.timezone}</span></td><td className="px-4 py-4 align-top text-aura-text-secondary">{formatInterviewMode(interview.mode ?? 'VIDEO')}</td><td className="max-w-52 px-4 py-4 align-top text-xs leading-5 text-aura-text-secondary">{interview.interviewers.map((person) => person.name).join(', ')}</td><td className="px-4 py-4 align-top"><Badge tone={tone(interview.status)}>{confirmedLabel ? 'Interview confirmed' : formatInterviewStatus(interview.status)}</Badge></td><td className="px-4 py-4 align-top"><Link className="font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/interviews/${interview.id}`}>View interview</Link></td></tr>)}</tbody></table></div>
}

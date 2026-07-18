import { CalendarClock, ExternalLink, MapPin, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ApiError } from '../../services/api'
import { getInterviewDetail } from '../../services/backendRecruiterApi'
import type { BackendInterviewCalendarItem } from '../../types/interviewCalendar'
import { formatCalendarDate, formatCalendarTime, getZonedDateKey, isValidMeetingUrl } from '../../utils/interviewCalendar'

const linkClass = 'inline-flex h-10 items-center justify-center rounded-aura-sm border border-marine/35 bg-white px-4 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15'

export default function BackendInterviewDetail({ interviewId }: { interviewId: string }) {
  const [interview, setInterview] = useState<BackendInterviewCalendarItem>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setInterview(await getInterviewDetail(interviewId))
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setError('Authentication required.')
      else if (caught instanceof ApiError && caught.status === 403) setError('You do not have permission to view this interview.')
      else if (caught instanceof ApiError && caught.status === 404) setError('Interview not found.')
      else setError('Unable to load the interview detail.')
    } finally {
      setLoading(false)
    }
  }, [interviewId])

  useEffect(() => { void load() }, [load])

  if (loading) return <PageContainer eyebrow="Interview operations" title="Loading interview"><Card className="p-8 text-center text-sm text-aura-text-secondary">Loading the persisted interview record…</Card></PageContainer>
  if (!interview || error) return <PageContainer eyebrow="Interview operations" title="Interview unavailable"><Card className="p-8 text-center"><p className="m-0 text-sm text-aura-text-secondary">{error}</p><Button className="mt-4" variant="secondary" onClick={() => void load()}>Retry</Button></Card></PageContainer>

  const date = getZonedDateKey(interview.scheduled_start, interview.timezone)
  return <PageContainer
    eyebrow="Interview operations"
    title={`${interview.candidate_name} interview`}
    description={`${interview.job_title} · ${label(interview.status)}`}
    actions={<div className="flex flex-wrap gap-2"><Link className={linkClass} to="/calendar">Back to calendar</Link><Link className={linkClass} to={`/candidates/${interview.application_id}`}>View candidate</Link></div>}
  >
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Persisted interview</p><h2 className="mb-0 mt-2 text-xl font-semibold text-depth">{interview.candidate_name}</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{interview.job_title}</p></div><Badge tone={tone(interview.status)}>{label(interview.status)}</Badge></div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <Detail icon={<CalendarClock size={14} />} label="Date and time" value={`${formatCalendarDate(date)} · ${formatCalendarTime(interview.scheduled_start, interview.timezone)}–${formatCalendarTime(interview.scheduled_end, interview.timezone)}`} />
          <Detail label="Timezone" value={interview.timezone} />
          <Detail label="Interview type" value={label(interview.interview_type)} />
          <Detail icon={<Users size={14} />} label="Interviewer" value={interview.interviewer_name ?? 'Unassigned'} />
          {interview.location ? <Detail icon={<MapPin size={14} />} label="Location" value={interview.location} /> : null}
        </dl>
      </Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Interview actions</h2><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">Open the candidate application or join the configured meeting.</p><div className="mt-5 flex flex-wrap gap-2"><Link className={linkClass} to={`/candidates/${interview.application_id}`}>Open candidate application</Link>{isValidMeetingUrl(interview.meeting_url ?? undefined) ? <a className={linkClass} href={interview.meeting_url!} rel="noreferrer" target="_blank">Join meeting <ExternalLink size={14} /></a> : null}</div></Card>
    </div>
  </PageContainer>
}

function Detail({ icon, label: title, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div><dt className="flex items-center gap-2 text-xs text-aura-text-muted">{icon}{title}</dt><dd className="mb-0 mt-1 text-sm font-semibold leading-6 text-depth">{value}</dd></div>
}
function label(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase()) }
function tone(status: string): 'neutral' | 'success' | 'warning' | 'accent' { if (status === 'COMPLETED' || status === 'CONFIRMED') return 'success'; if (status === 'CANCELLED' || status === 'NO_SHOW') return 'neutral'; if (status === 'PENDING_CONFIRMATION' || status === 'NEEDS_RESCHEDULING' || status === 'DRAFT') return 'warning'; return 'accent' }

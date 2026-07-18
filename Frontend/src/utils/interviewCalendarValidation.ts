import type { BackendInterviewCalendarResponse, CalendarInterview } from '../types/interviewCalendar'
import {
  filterCalendarInterviews,
  getZonedDateKey,
  groupCalendarInterviews,
  mapBackendInterviewCalendar,
  summarizeCalendar,
} from './interviewCalendar'

export function validateInterviewCalendarDomain() {
  const errors: string[] = []
  const base: CalendarInterview = {
    id: 'interview-1',
    applicationId: 'application-1',
    candidateId: 'candidate-1',
    candidateName: 'Aye Aye',
    jobId: 'job-1',
    jobTitle: 'Backend Engineer',
    interviewers: [{ id: 'user-1', name: 'Mya Mya' }],
    interviewType: 'TECHNICAL',
    status: 'PENDING_CONFIRMATION',
    scheduledStart: '2026-07-31T18:00:00+00:00',
    scheduledEnd: '2026-07-31T19:00:00+00:00',
    timezone: 'Asia/Yangon',
  }
  const items: CalendarInterview[] = [
    base,
    { ...base, id: 'interview-2', candidateId: 'candidate-2', candidateName: 'John Doe', scheduledStart: '2026-07-31T18:30:00+00:00', scheduledEnd: '2026-07-31T19:30:00+00:00', status: 'CONFIRMED' },
    { ...base, id: 'interview-3', candidateId: 'candidate-3', candidateName: 'Su Su', scheduledStart: '2026-07-31T19:00:00+00:00', scheduledEnd: '2026-07-31T20:00:00+00:00', status: 'CANCELLED' },
  ]

  check(errors, getZonedDateKey(base.scheduledStart, 'Asia/Yangon') === '2026-08-01', 'Midnight timezone boundary grouped into the wrong date.')
  check(errors, groupCalendarInterviews(items, 'Asia/Yangon').get('2026-08-01')?.length === 3, 'Calendar did not group all interview records by local date.')
  const summary = summarizeCalendar(items, 'Asia/Yangon', new Date('2026-07-31T18:15:00Z'))
  check(errors, summary.totalInterviews === 2 && summary.todayInterviews === 2, 'Cancelled interviews were included in active totals.')
  check(errors, summary.busiestDate === '2026-08-01' && summary.busiestDateTotal === 2, 'Busiest day calculation is incorrect.')
  check(errors, summary.pendingConfirmation === 1, 'Pending confirmation total is incorrect.')
  check(errors, filterCalendarInterviews(items, { jobId: '', status: 'CONFIRMED', interviewerId: '', interviewType: '' }).length === 1, 'Status filter did not update calendar records.')

  const backend: BackendInterviewCalendarResponse = {
    range: { start: '2026-08-01T00:00:00+06:30', end: '2026-09-01T00:00:00+06:30', timezone: 'Asia/Yangon' },
    days: [{ date: '2026-08-01', total_interviews: 1, interviews: [{
      id: '00000000-0000-0000-0000-000000000001', application_id: '00000000-0000-0000-0000-000000000002', candidate_id: '00000000-0000-0000-0000-000000000003', candidate_name: 'Backend Candidate', job_id: '00000000-0000-0000-0000-000000000004', job_title: 'Backend Engineer', interviewer_id: null, interviewer_name: null, interview_type: 'TECHNICAL', status: 'CONFIRMED', scheduled_start: '2026-08-01T09:00:00+06:30', scheduled_end: '2026-08-01T10:00:00+06:30', timezone: 'Asia/Yangon', location: null, meeting_url: null,
    }] }],
    summary: { total_interviews: 1, today_interviews: 0, pending_confirmation: 0, busiest_date: '2026-08-01', busiest_date_total: 1 },
  }
  const mapped = mapBackendInterviewCalendar(backend)
  check(errors, mapped[0]?.candidateId === backend.days[0]?.interviews[0]?.candidate_id, 'Backend UUID mapping used a demo identifier.')

  return { valid: errors.length === 0, errors }
}

function check(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

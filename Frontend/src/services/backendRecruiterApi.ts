import type {
  HumanScreeningReviewPayload,
  PublicBackendApplicationForm,
  RecruiterScreeningDetail,
  RecruiterScreeningListItem,
} from '../types/backendScreening'
import type { BackendInterviewCalendarResponse } from '../types/interviewCalendar'
import { apiRequest, setBackendAccessToken } from './api'

export async function login(email: string, password: string) {
  const response = await apiRequest<{ access_token: string; token_type: string }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  setBackendAccessToken(response.access_token)
  return response
}

export function getRecruiterScreenings(filters?: {
  screening_status?: string
  job_id?: string
  recommendation?: string
}) {
  const params = new URLSearchParams()
  if (filters?.screening_status) params.set('screening_status', filters.screening_status)
  if (filters?.job_id) params.set('job_id', filters.job_id)
  if (filters?.recommendation) params.set('recommendation', filters.recommendation)
  const query = params.toString()
  return apiRequest<RecruiterScreeningListItem[]>(`/recruiter/screenings${query ? `?${query}` : ''}`)
}

export function getRecruiterScreeningDetail(applicationId: string) {
  return apiRequest<RecruiterScreeningDetail>(`/recruiter/applications/${applicationId}/screening`)
}

export function retryRecruiterScreening(applicationId: string) {
  return apiRequest<RecruiterScreeningListItem>(`/recruiter/applications/${applicationId}/screening/retry`, {
    method: 'POST',
  })
}

export function submitHumanScreeningReview(applicationId: string, payload: HumanScreeningReviewPayload) {
  return apiRequest<{ id: string; application_id: string; screening_run_id: string; action: string; created_at: string }>(
    `/recruiter/applications/${applicationId}/screening/review`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export function getPublicBackendApplicationForm(jobId: string) {
  return apiRequest<PublicBackendApplicationForm>(`/public/jobs/${jobId}/application-form`)
}

export function getLatestPublicBackendApplicationForm() {
  return apiRequest<PublicBackendApplicationForm>('/public/jobs/latest/application-form')
}

export function getInterviewCalendar(params: {
  start: string
  end: string
  job_id?: string
  status?: string
  interviewer_id?: string
  interview_type?: string
}) {
  const query = new URLSearchParams({ start: params.start, end: params.end })
  if (params.job_id) query.set('job_id', params.job_id)
  if (params.status) query.set('status', params.status)
  if (params.interviewer_id) query.set('interviewer_id', params.interviewer_id)
  if (params.interview_type) query.set('interview_type', params.interview_type)
  return apiRequest<BackendInterviewCalendarResponse>(`/recruiter/interviews/calendar?${query}`)
}

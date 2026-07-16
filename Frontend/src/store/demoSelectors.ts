import type { Application } from '../types/application'
import type { ApplicationForm } from '../types/applicationForm'
import type { Candidate } from '../types/candidate'
import type { Communication } from '../types/communication'
import type { Decision } from '../types/decision'
import type { Evaluation } from '../types/evaluation'
import type { Interview } from '../types/interview'
import type { Job } from '../types/job'
import type { Transcript } from '../types/transcript'
import type { DemoState } from './demoReducer'

export function selectJobById(
  state: DemoState,
  jobId: string,
): Job | undefined {
  return state.jobs.find((job) => job.id === jobId)
}

export function selectCandidateById(
  state: DemoState,
  candidateId: string,
): Candidate | undefined {
  return state.candidates.find((candidate) => candidate.id === candidateId)
}

export function selectApplicationById(
  state: DemoState,
  applicationId: string,
): Application | undefined {
  return state.applications.find(
    (application) => application.id === applicationId,
  )
}

export function selectApplicationsByJobId(
  state: DemoState,
  jobId: string,
): Application[] {
  return state.applications.filter((application) => application.jobId === jobId)
}

export function selectApplicationFormsByJobId(
  state: DemoState,
  jobId: string,
): ApplicationForm[] {
  return state.applicationForms
    .filter((form) => form.jobId === jobId)
    .sort((left, right) => right.version - left.version)
}

export function selectPublishedApplicationFormByJobId(
  state: DemoState,
  jobId: string,
): ApplicationForm | undefined {
  return selectApplicationFormsByJobId(state, jobId).find(
    (form) => form.status === 'PUBLISHED',
  )
}

export function selectApplicationFormById(
  state: DemoState,
  formId: string,
): ApplicationForm | undefined {
  return state.applicationForms.find((form) => form.id === formId)
}

export function selectDraftApplicationFormByJobId(
  state: DemoState,
  jobId: string,
): ApplicationForm | undefined {
  return selectApplicationFormsByJobId(state, jobId).find(
    (form) => form.status === 'DRAFT',
  )
}

export function selectCandidateForApplication(
  state: DemoState,
  applicationId: string,
): Candidate | undefined {
  const application = selectApplicationById(state, applicationId)

  return application
    ? selectCandidateById(state, application.candidateId)
    : undefined
}

function selectLatestEvaluationByType(
  state: DemoState,
  applicationId: string,
  evaluationType: 'SCREENING' | 'FINAL',
): Evaluation | undefined {
  return state.evaluations
    .filter(
      (evaluation) =>
        evaluation.applicationId === applicationId &&
        evaluation.evaluationType === evaluationType,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

export function selectLatestScreeningEvaluation(
  state: DemoState,
  applicationId: string,
): Evaluation | undefined {
  return selectLatestEvaluationByType(state, applicationId, 'SCREENING')
}

export function selectLatestFinalEvaluation(
  state: DemoState,
  applicationId: string,
): Evaluation | undefined {
  return selectLatestEvaluationByType(state, applicationId, 'FINAL')
}

export function selectInterviewByApplicationId(
  state: DemoState,
  applicationId: string,
): Interview | undefined {
  return state.interviews.find(
    (interview) => interview.applicationId === applicationId,
  )
}

export function selectTranscriptByInterviewId(
  state: DemoState,
  interviewId: string,
): Transcript | undefined {
  return state.transcripts.find(
    (transcript) => transcript.interviewId === interviewId,
  )
}

export function selectCommunicationsByApplicationId(
  state: DemoState,
  applicationId: string,
): Communication[] {
  return state.communications.filter(
    (communication) => communication.applicationId === applicationId,
  )
}

export function selectDecisionByApplicationId(
  state: DemoState,
  applicationId: string,
): Decision | undefined {
  return state.decisions
    .filter((decision) => decision.applicationId === applicationId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

export type DashboardMetrics = {
  activeJobs: number
  totalCandidates: number
  pendingAiReviews: number
  interviewsToday: number
}

export function selectDashboardMetrics(
  state: DemoState,
  now: Date,
): DashboardMetrics {
  const calendarDate = now.toISOString().slice(0, 10)

  return {
    activeJobs: state.jobs.filter((job) => job.status === 'OPEN').length,
    totalCandidates: state.candidates.length,
    pendingAiReviews: state.applications.filter((application) => {
      const evaluation = selectLatestScreeningEvaluation(state, application.id)
      const decision = selectDecisionByApplicationId(state, application.id)

      return evaluation?.recommendation === 'REVIEW' && !decision
    }).length,
    interviewsToday: state.interviews.filter(
      (interview) => interview.scheduledStart.slice(0, 10) === calendarDate,
    ).length,
  }
}

export type HiringFunnel = {
  applications: number
  aiScreened: number
  shortlisted: number
  interviewed: number
  selected: number
}

export function selectHiringFunnel(
  state: DemoState,
  jobId?: string,
): HiringFunnel {
  const applications = jobId
    ? selectApplicationsByJobId(state, jobId)
    : state.applications

  return {
    applications: applications.length,
    aiScreened: applications.filter((application) =>
      state.evaluations.some(
        (evaluation) =>
          evaluation.applicationId === application.id &&
          evaluation.evaluationType === 'SCREENING' &&
          evaluation.status === 'COMPLETED',
      ),
    ).length,
    shortlisted: applications.filter((application) => {
      const recommendation = selectLatestScreeningEvaluation(
        state,
        application.id,
      )?.recommendation

      return recommendation === 'STRONG_YES' || recommendation === 'YES'
    }).length,
    interviewed: applications.filter((application) =>
      state.interviews.some(
        (interview) =>
          interview.applicationId === application.id &&
          interview.status === 'COMPLETED',
      ),
    ).length,
    selected: applications.filter((application) => {
      const decision = selectDecisionByApplicationId(state, application.id)

      return (
        application.status === 'SELECTED' ||
        decision?.humanDecision === 'SELECTED'
      )
    }).length,
  }
}

export function selectActiveJobs(state: DemoState): Job[] {
  return state.jobs
    .filter((job) => job.status === 'OPEN')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export type RecentApplicationItem = {
  application: Application
  candidate: Candidate
  job: Job
  screeningEvaluation?: Evaluation
}

export function selectRecentApplications(
  state: DemoState,
  limit = 5,
): RecentApplicationItem[] {
  return state.applications
    .map((application): RecentApplicationItem | undefined => {
      const candidate = selectCandidateById(state, application.candidateId)
      const job = selectJobById(state, application.jobId)

      return candidate && job
        ? {
            application,
            candidate,
            job,
            screeningEvaluation: selectLatestScreeningEvaluation(
              state,
              application.id,
            ),
          }
        : undefined
    })
    .filter((item): item is RecentApplicationItem => item !== undefined)
    .sort((left, right) =>
      right.application.submittedAt.localeCompare(
        left.application.submittedAt,
      ),
    )
    .slice(0, Math.max(0, limit))
}

export type UpcomingInterviewItem = {
  interview: Interview
  application: Application
  candidate: Candidate
  job: Job
}

export function selectUpcomingInterviews(
  state: DemoState,
  now: Date,
  limit = 5,
): UpcomingInterviewItem[] {
  const nowTimestamp = now.getTime()

  return state.interviews
    .filter(
      (interview) =>
        (interview.status === 'SCHEDULED' ||
          interview.status === 'IN_PROGRESS') &&
        new Date(interview.scheduledStart).getTime() >= nowTimestamp,
    )
    .map((interview): UpcomingInterviewItem | undefined => {
      const application = selectApplicationById(state, interview.applicationId)
      const candidate = application
        ? selectCandidateById(state, application.candidateId)
        : undefined
      const job = application
        ? selectJobById(state, application.jobId)
        : undefined

      return application && candidate && job
        ? { interview, application, candidate, job }
        : undefined
    })
    .filter((item): item is UpcomingInterviewItem => item !== undefined)
    .sort((left, right) =>
      left.interview.scheduledStart.localeCompare(
        right.interview.scheduledStart,
      ),
    )
    .slice(0, Math.max(0, limit))
}

export function selectApplicationCountByJobId(
  state: DemoState,
  jobId: string,
): number {
  return state.applications.filter((application) => application.jobId === jobId)
    .length
}

export type CandidateApplicationItem = {
  application: Application
  job: Job
  screeningEvaluation?: Evaluation
  finalEvaluation?: Evaluation
  interview?: Interview
  decision?: Decision
}

export function selectCandidateApplications(
  state: DemoState,
  candidateId: string,
): CandidateApplicationItem[] {
  return state.applications
    .filter((application) => application.candidateId === candidateId)
    .map((application): CandidateApplicationItem | undefined => {
      const job = selectJobById(state, application.jobId)

      return job
        ? {
            application,
            job,
            screeningEvaluation: selectLatestScreeningEvaluation(
              state,
              application.id,
            ),
            finalEvaluation: selectLatestFinalEvaluation(state, application.id),
            interview: selectInterviewByApplicationId(state, application.id),
            decision: selectDecisionByApplicationId(state, application.id),
          }
        : undefined
    })
    .filter((item): item is CandidateApplicationItem => item !== undefined)
    .sort((left, right) =>
      right.application.submittedAt.localeCompare(
        left.application.submittedAt,
      ),
    )
}

export type CandidateListItem = {
  candidate: Candidate
  application: Application
  job: Job
  screeningEvaluation?: Evaluation
  interview?: Interview
  decision?: Decision
}

export function selectCandidateListItems(
  state: DemoState,
  jobId?: string,
): CandidateListItem[] {
  return state.applications
    .filter((application) => !jobId || application.jobId === jobId)
    .map((application): CandidateListItem | undefined => {
      const candidate = selectCandidateById(state, application.candidateId)
      const job = selectJobById(state, application.jobId)

      return candidate && job
        ? {
            candidate,
            application,
            job,
            screeningEvaluation: selectLatestScreeningEvaluation(
              state,
              application.id,
            ),
            interview: selectInterviewByApplicationId(state, application.id),
            decision: selectDecisionByApplicationId(state, application.id),
          }
        : undefined
    })
    .filter((item): item is CandidateListItem => item !== undefined)
    .sort((left, right) =>
      right.application.submittedAt.localeCompare(
        left.application.submittedAt,
      ),
    )
}

export type CandidateTimelineEvent = {
  id: string
  type:
    | 'APPLICATION_SUBMITTED'
    | 'SCREENING_COMPLETED'
    | 'INTERVIEW_SCHEDULED'
    | 'INTERVIEW_COMPLETED'
    | 'FINAL_EVALUATION_COMPLETED'
    | 'DECISION_RECORDED'
    | 'COMMUNICATION_SENT'
  title: string
  description?: string
  occurredAt: string
}

export function selectCandidateTimeline(
  state: DemoState,
  applicationId: string,
): CandidateTimelineEvent[] {
  const application = selectApplicationById(state, applicationId)

  if (!application) {
    return []
  }

  const events: CandidateTimelineEvent[] = [
    {
      id: `application-submitted-${application.id}`,
      type: 'APPLICATION_SUBMITTED',
      title: 'Application submitted',
      description: 'The candidate submitted their application for review.',
      occurredAt: application.submittedAt,
    },
  ]

  state.evaluations
    .filter(
      (evaluation) =>
        evaluation.applicationId === applicationId &&
        evaluation.evaluationType === 'SCREENING' &&
        evaluation.status === 'COMPLETED',
    )
    .forEach((evaluation) => {
      events.push({
        id: `screening-completed-${evaluation.id}`,
        type: 'SCREENING_COMPLETED',
        title: 'AI screening completed',
        description: 'A screening recommendation is available for review.',
        occurredAt: evaluation.createdAt,
      })
    })

  state.interviews
    .filter((interview) => interview.applicationId === applicationId)
    .forEach((interview) => {
      events.push({
        id: `interview-scheduled-${interview.id}`,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview scheduled',
        description: `Interview arranged with ${interview.interviewers.length} interviewer${interview.interviewers.length === 1 ? '' : 's'}.`,
        occurredAt: interview.scheduledStart,
      })

      if (interview.status === 'COMPLETED') {
        events.push({
          id: `interview-completed-${interview.id}`,
          type: 'INTERVIEW_COMPLETED',
          title: 'Interview completed',
          description: 'The scheduled interview session was completed.',
          occurredAt: interview.scheduledEnd,
        })
      }
    })

  state.evaluations
    .filter(
      (evaluation) =>
        evaluation.applicationId === applicationId &&
        evaluation.evaluationType === 'FINAL' &&
        evaluation.status === 'COMPLETED',
    )
    .forEach((evaluation) => {
      events.push({
        id: `final-evaluation-completed-${evaluation.id}`,
        type: 'FINAL_EVALUATION_COMPLETED',
        title: 'Final evaluation completed',
        description: 'The final candidate evaluation was completed.',
        occurredAt: evaluation.createdAt,
      })
    })

  state.decisions
    .filter((decision) => decision.applicationId === applicationId)
    .forEach((decision) => {
      events.push({
        id: `decision-recorded-${decision.id}`,
        type: 'DECISION_RECORDED',
        title: 'Human decision recorded',
        description: 'A hiring decision was recorded for this application.',
        occurredAt: decision.createdAt,
      })
    })

  state.communications
    .filter(
      (communication) =>
        communication.applicationId === applicationId &&
        communication.status === 'SENT' &&
        communication.sentAt,
    )
    .forEach((communication) => {
      if (communication.sentAt) {
        events.push({
          id: `communication-sent-${communication.id}`,
          type: 'COMMUNICATION_SENT',
          title: 'Communication sent',
          description: communication.subject,
          occurredAt: communication.sentAt,
        })
      }
    })

  return events.sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt),
  )
}

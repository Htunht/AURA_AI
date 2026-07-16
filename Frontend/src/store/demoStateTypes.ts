import type { Application } from '../types/application'
import type { ApplicationForm } from '../types/applicationForm'
import type { Candidate } from '../types/candidate'
import type { Communication } from '../types/communication'
import type { Decision } from '../types/decision'
import type { Evaluation } from '../types/evaluation'
import type { Interview } from '../types/interview'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'
import type { Job } from '../types/job'
import type { EvaluationRubric } from '../types/rubric'
import type { ScreeningQueueItem } from '../types/screeningQueue'
import type { Transcript } from '../types/transcript'

export type DemoState = {
  jobs: Job[]
  candidates: Candidate[]
  applications: Application[]
  applicationForms: ApplicationForm[]
  rubrics: EvaluationRubric[]
  evaluations: Evaluation[]
  interviews: Interview[]
  interviewQuestionSets: InterviewQuestionSet[]
  interviewSchedulingPolicies: InterviewSchedulingPolicy[]
  interviewSchedulingInvitations: InterviewSchedulingInvitation[]
  transcripts: Transcript[]
  communications: Communication[]
  decisions: Decision[]
  screeningQueue: ScreeningQueueItem[]
}

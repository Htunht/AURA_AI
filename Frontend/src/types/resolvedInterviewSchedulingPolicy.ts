import type { InterviewSchedulingPolicy } from './interviewSchedulingPolicy'

export type InterviewSchedulingPolicySource =
  | 'JOB_OVERRIDE'
  | 'DEPARTMENT_TEMPLATE'
  | 'ORGANIZATION_DEFAULT'

export type ResolvedInterviewSchedulingPolicy = {
  policy: InterviewSchedulingPolicy
  source: InterviewSchedulingPolicySource
  sourceLabel: string
}

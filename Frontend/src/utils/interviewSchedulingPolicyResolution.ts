import type { InterviewSchedulingPolicy, InterviewSchedulingPolicyScope } from '../types/interviewSchedulingPolicy'
import type { ResolvedInterviewSchedulingPolicy } from '../types/resolvedInterviewSchedulingPolicy'
import type { Job } from '../types/job'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'

export function normalizePolicyDepartment(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function policyTargetMatches(
  policy: Pick<InterviewSchedulingPolicy, 'scope' | 'department' | 'jobId'>,
  target: Pick<InterviewSchedulingPolicy, 'scope' | 'department' | 'jobId'>,
): boolean {
  if (policy.scope !== target.scope) return false
  if (policy.scope === 'ORGANIZATION') return true
  if (policy.scope === 'DEPARTMENT') {
    return normalizePolicyDepartment(policy.department ?? '') === normalizePolicyDepartment(target.department ?? '')
  }
  return policy.jobId === target.jobId
}

export function isSameSchedulingPolicyTarget(
  left: Pick<InterviewSchedulingPolicy, 'scope' | 'department' | 'jobId'>,
  right: Pick<InterviewSchedulingPolicy, 'scope' | 'department' | 'jobId'>,
): boolean {
  return policyTargetMatches(left, right)
}

function policySlug(input: { scope: InterviewSchedulingPolicyScope; department?: string; jobId?: string }): string {
  if (input.scope === 'ORGANIZATION') return 'organization'
  if (input.scope === 'JOB') return `job-${input.jobId ?? 'unknown'}`
  return `department-${normalizePolicyDepartment(input.department ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown'}`
}

export function createNextSchedulingPolicyId(
  policies: InterviewSchedulingPolicy[],
  input: { scope: InterviewSchedulingPolicyScope; department?: string; jobId?: string },
): string {
  const version = Math.max(
    0,
    ...policies.filter((policy) => policyTargetMatches(policy, input)).map((policy) => policy.version),
  ) + 1
  return `interview-policy-${policySlug(input)}-v${version}`
}

function selectDeterministicPolicy(policies: InterviewSchedulingPolicy[]): InterviewSchedulingPolicy | undefined {
  return [...policies].sort((left, right) =>
    right.version - left.version ||
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.id.localeCompare(right.id),
  )[0]
}

export function resolveInterviewSchedulingPolicy(input: {
  policies: InterviewSchedulingPolicy[]
  job: Job
}): ResolvedInterviewSchedulingPolicy | undefined {
  const active = input.policies.filter((policy) => policy.status === 'ACTIVE')
  const jobOverride = selectDeterministicPolicy(active.filter((policy) => policy.scope === 'JOB' && policy.jobId === input.job.id))
  if (jobOverride) return { policy: jobOverride, source: 'JOB_OVERRIDE', sourceLabel: 'Custom policy for this job' }

  const department = normalizePolicyDepartment(input.job.department)
  const departmentTemplate = selectDeterministicPolicy(active.filter((policy) =>
    policy.scope === 'DEPARTMENT' && normalizePolicyDepartment(policy.department ?? '') === department,
  ))
  if (departmentTemplate) return { policy: departmentTemplate, source: 'DEPARTMENT_TEMPLATE', sourceLabel: `${departmentTemplate.department?.trim() || input.job.department} default` }

  const organizationDefault = selectDeterministicPolicy(active.filter((policy) => policy.scope === 'ORGANIZATION'))
  return organizationDefault
    ? { policy: organizationDefault, source: 'ORGANIZATION_DEFAULT', sourceLabel: 'Organization default' }
    : undefined
}

export function canRecoverPolicyMissingSchedulingException(input: {
  policies: InterviewSchedulingPolicy[]
  jobs: Job[]
  invitation: InterviewSchedulingInvitation
}): boolean {
  if (input.invitation.status !== 'EXCEPTION_REQUIRED' || input.invitation.exceptionReason !== 'POLICY_MISSING') return false
  const job = input.jobs.find((item) => item.id === input.invitation.jobId)
  return Boolean(job && resolveInterviewSchedulingPolicy({ policies: input.policies, job }))
}

import interviewersData from '../data/interviewers.json'
import { prepareSchedulingInvitation } from '../services/interviewSchedulingAutomation'
import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import { normalizePersistedDemoState } from '../store/demoPersistence'
import { selectJobsWithoutResolvedSchedulingPolicy, selectResolvedInterviewSchedulingPolicy, selectSchedulingPolicyResolutionSummary } from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import type { Decision } from '../types/decision'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'
import type { Interviewer } from '../types/interviewer'
import type { Job } from '../types/job'
import { canRecoverPolicyMissingSchedulingException, createNextSchedulingPolicyId, normalizePolicyDepartment, resolveInterviewSchedulingPolicy } from './interviewSchedulingPolicyResolution'
import { validateInterviewSchedulingPolicy } from './interviewSchedulingPolicyValidation'

export type InterviewSchedulingPolicyInheritanceValidationResult = { valid: boolean; errors: string[] }
const now = new Date('2026-07-20T08:00:00.000Z')
const interviewers = interviewersData as Interviewer[]
function check(errors: string[], condition: boolean, message: string) { if (!condition) errors.push(message) }

function eligibleState(jobId: string): { state: DemoState; application: Application } {
  const sourceCandidate = initialDemoState.candidates[0]!
  const sourceApplication = initialDemoState.applications[0]!
  const sourceEvaluation = initialDemoState.evaluations[0]!
  const candidate: Candidate = { ...sourceCandidate, id: 'candidate-inheritance', email: 'inheritance@example.com' }
  const application: Application = { ...sourceApplication, id: 'application-inheritance', candidateId: candidate.id, jobId, currentStage: 'SHORTLIST_REVIEW' }
  const decision: Decision = { id: 'decision-inheritance', applicationId: application.id, evaluationId: sourceEvaluation.id, reviewAction: 'CONFIRM', aiRecommendation: 'YES', humanRecommendation: 'YES', humanDecision: 'NEXT_STAGE', createdAt: now.toISOString() }
  return { state: { ...initialDemoState, candidates: [candidate], applications: [application], decisions: [decision], interviews: [], interviewSchedulingInvitations: [], transcripts: [], communications: [], screeningQueue: [] }, application }
}

export function validateInterviewSchedulingPolicyInheritanceDomain(): InterviewSchedulingPolicyInheritanceValidationResult {
  const errors: string[] = []
  const snapshot = JSON.stringify(initialDemoState)
  const organization = initialDemoState.interviewSchedulingPolicies.find((item) => item.scope === 'ORGANIZATION')!
  const engineering = initialDemoState.interviewSchedulingPolicies.find((item) => item.scope === 'DEPARTMENT' && item.department === 'Engineering')!
  const jobOverride = initialDemoState.interviewSchedulingPolicies.find((item) => item.scope === 'JOB' && item.jobId === 'job-001')!
  check(errors, Boolean(organization) && validateInterviewSchedulingPolicy(organization, initialDemoState).valid, 'Organization policy scope is invalid')
  check(errors, initialDemoState.interviewSchedulingPolicies.filter((item) => item.scope === 'ORGANIZATION' && item.status === 'ACTIVE').length === 1, 'Initial state has multiple active organization defaults')
  check(errors, initialDemoState.interviewSchedulingPolicies.filter((item) => item.scope === 'DEPARTMENT' && item.status === 'ACTIVE' && normalizePolicyDepartment(item.department ?? '') === 'engineering').length === 1, 'Initial state has multiple active Engineering templates')
  check(errors, initialDemoState.interviewSchedulingPolicies.filter((item) => item.scope === 'JOB' && item.status === 'ACTIVE' && item.jobId === 'job-001').length === 1, 'Initial state has multiple active job overrides')

  const invalidDepartment = { ...engineering, id: 'invalid-department', department: '' }
  check(errors, !validateInterviewSchedulingPolicy(invalidDepartment, initialDemoState).valid, 'Department policy did not require a department')
  const invalidJob = { ...jobOverride, id: 'invalid-job', jobId: 'missing-job' }
  check(errors, !validateInterviewSchedulingPolicy(invalidJob, initialDemoState).valid, 'Job policy did not require a valid job ID')
  check(errors, normalizePolicyDepartment('  Product   Design ') === 'product design', 'Department normalization is not deterministic')

  const nextOrganizationId = createNextSchedulingPolicyId(initialDemoState.interviewSchedulingPolicies, { scope: 'ORGANIZATION' })
  const nextDepartmentId = createNextSchedulingPolicyId(initialDemoState.interviewSchedulingPolicies, { scope: 'DEPARTMENT', department: ' ENGINEERING ' })
  const nextJobId = createNextSchedulingPolicyId(initialDemoState.interviewSchedulingPolicies, { scope: 'JOB', jobId: 'job-001' })
  check(errors, nextOrganizationId === 'interview-policy-organization-v2' && nextDepartmentId === 'interview-policy-department-engineering-v2' && nextJobId === 'interview-policy-job-job-001-v2', 'Policy IDs are not deterministic')

  const jobOne = initialDemoState.jobs.find((item) => item.id === 'job-001')!
  const jobThree = initialDemoState.jobs.find((item) => item.id === 'job-003')!
  const operationsJob: Job = { ...jobThree, id: 'job-operations', department: 'Operations' }
  check(errors, resolveInterviewSchedulingPolicy({ policies: initialDemoState.interviewSchedulingPolicies, job: jobOne })?.source === 'JOB_OVERRIDE', 'Job override did not resolve before department template')
  const withoutJobOverrides = initialDemoState.interviewSchedulingPolicies.filter((item) => item.scope !== 'JOB')
  const departmentResolution = resolveInterviewSchedulingPolicy({ policies: withoutJobOverrides, job: jobOne })
  check(errors, departmentResolution?.source === 'DEPARTMENT_TEMPLATE' && departmentResolution.sourceLabel === 'Engineering default', 'Department template did not resolve before organization default')
  check(errors, resolveInterviewSchedulingPolicy({ policies: withoutJobOverrides, job: operationsJob })?.source === 'ORGANIZATION_DEFAULT', 'Organization default did not resolve as fallback')
  check(errors, resolveInterviewSchedulingPolicy({ policies: [organization], job: operationsJob })?.policy === organization, 'Job creation incorrectly required a job-specific policy')
  check(errors, !resolveInterviewSchedulingPolicy({ policies: [], job: operationsJob }), 'Resolver did not return undefined without policies')
  check(errors, resolveInterviewSchedulingPolicy({ policies: withoutJobOverrides, job: { ...jobOne, department: ' engineering ' } })?.policy.id === engineering.id, 'Normalized department matching failed')

  const engineeringV2: InterviewSchedulingPolicy = { ...engineering, id: 'interview-policy-department-engineering-v2', version: 2, updatedAt: '2026-07-16T00:00:00.000Z' }
  check(errors, resolveInterviewSchedulingPolicy({ policies: [...withoutJobOverrides, engineeringV2], job: jobThree })?.policy.id === engineeringV2.id, 'Highest active policy version did not resolve deterministically')
  check(errors, selectResolvedInterviewSchedulingPolicy(initialDemoState, 'job-003')?.source === 'DEPARTMENT_TEMPLATE', 'Engineering job did not resolve Engineering template')

  const summary = selectSchedulingPolicyResolutionSummary(initialDemoState)
  check(errors, summary.jobOverrides === 2 && summary.departmentTemplates === 1 && summary.organizationDefaults === 0 && summary.unresolvedJobs === 0, 'Dashboard scheduling coverage counts are incorrect')
  check(errors, selectJobsWithoutResolvedSchedulingPolicy({ ...initialDemoState, interviewSchedulingPolicies: [] }).length === initialDemoState.jobs.length, 'Multiple unresolved jobs did not produce a global setup count')

  const legacyPolicy: Omit<InterviewSchedulingPolicy, 'scope' | 'displayName'> & Partial<Pick<InterviewSchedulingPolicy, 'scope' | 'displayName'>> = { ...jobOverride }
  delete legacyPolicy.scope
  delete legacyPolicy.displayName
  const migrated = normalizePersistedDemoState({ ...initialDemoState, interviewSchedulingPolicies: [legacyPolicy as InterviewSchedulingPolicy] })
  check(errors, migrated.interviewSchedulingPolicies.some((item) => item.id === legacyPolicy.id && item.scope === 'JOB' && Boolean(item.displayName)), 'Legacy job policy did not migrate to JOB scope')
  check(errors, migrated.interviewSchedulingPolicies.some((item) => item.scope === 'ORGANIZATION'), 'Organization default was not added during persistence migration')

  const draftOrganization: InterviewSchedulingPolicy = { ...organization, id: nextOrganizationId, version: 2, status: 'DRAFT' }
  const withDraft = demoReducer(initialDemoState, { type: 'ADD_INTERVIEW_SCHEDULING_POLICY', payload: { policy: draftOrganization } })
  const activated = demoReducer(withDraft, { type: 'ACTIVATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: draftOrganization.id, updatedAt: now.toISOString() } })
  check(errors, activated.interviewSchedulingPolicies.filter((item) => item.scope === 'ORGANIZATION' && item.status === 'ACTIVE').length === 1, 'More than one active organization policy remained after activation')
  check(errors, activated.interviewSchedulingPolicies.find((item) => item.id === organization.id)?.status === 'ARCHIVED', 'Activating a new organization version did not archive the previous version')

  const { state, application } = eligibleState('job-003')
  const prepared = prepareSchedulingInvitation({ state, applicationId: application.id, interviewers, now })
  check(errors, prepared.invitation?.status === 'PENDING' && prepared.invitation.policyId === engineering.id && prepared.invitation.policySource === 'DEPARTMENT_TEMPLATE', 'Scheduling automation did not store the resolved department policy snapshot')

  const noPolicyState = { ...state, interviewSchedulingPolicies: [] }
  const missing = prepareSchedulingInvitation({ state: noPolicyState, applicationId: application.id, interviewers, now }).invitation!
  check(errors, missing.exceptionReason === 'POLICY_MISSING', 'Missing inherited policy did not create a policy exception')
  const recoverableState = { ...noPolicyState, interviewSchedulingPolicies: [organization] }
  check(errors, canRecoverPolicyMissingSchedulingException({ policies: recoverableState.interviewSchedulingPolicies, jobs: recoverableState.jobs, invitation: missing }), 'New organization default did not make POLICY_MISSING exception recoverable')
  check(errors, prepareSchedulingInvitation({ state: recoverableState, applicationId: application.id, interviewers, now }).invitation?.status === 'PENDING', 'Recovered policy exception did not prepare an invitation')
  check(errors, canRecoverPolicyMissingSchedulingException({ policies: [engineering], jobs: noPolicyState.jobs, invitation: missing }), 'New department template did not make matching POLICY_MISSING exception recoverable')
  const unrelated: InterviewSchedulingInvitation = { ...missing, exceptionReason: 'NO_AVAILABLE_SLOTS' }
  check(errors, !canRecoverPolicyMissingSchedulingException({ policies: recoverableState.interviewSchedulingPolicies, jobs: recoverableState.jobs, invitation: unrelated }), 'Unrelated scheduling exception was marked for automatic retry')
  const pending = prepared.invitation!
  check(errors, !canRecoverPolicyMissingSchedulingException({ policies: activated.interviewSchedulingPolicies, jobs: state.jobs, invitation: pending }), 'Existing pending invitation was marked for regeneration after policy change')

  check(errors, JSON.stringify(activated.interviews) === JSON.stringify(initialDemoState.interviews), 'Confirmed interviews changed during policy activation')
  check(errors, typeof JSON.stringify(activated) === 'string', 'Inherited policy state is not JSON serializable')
  check(errors, JSON.stringify(initialDemoState) === snapshot, 'Inheritance validation mutated initial seed state')
  return { valid: errors.length === 0, errors }
}

import type { DemoState } from '../store/demoStateTypes'
import type { EmploymentType, Job, JobStatus, SkillRequirement, WorkArrangement } from '../types/job'
import type { JobDraftInput } from '../types/jobDraft'

export type JobValidationResult = { valid: boolean; errors: Record<string, string> }
export type JobReadinessStatus = 'JOB_DETAILS_INCOMPLETE' | 'APPLICATION_FORM_REQUIRED' | 'SCREENING_SETUP_REQUIRED' | 'READY' | 'OPEN'
export type JobReadinessResult = { status: JobReadinessStatus; ready: boolean; issues: string[] }
export type JobRelatedRecordCounts = {
  applications: number
  applicationForms: number
  rubrics: number
  evaluations: number
  interviews: number
  decisions: number
  screeningQueue: number
  schedulingInvitations: number
  schedulingPolicies: number
}
export type JobDeletionCheck = { allowed: boolean; reasons: string[] }

export const employmentTypes: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY']
export const workArrangements: WorkArrangement[] = ['ONSITE', 'HYBRID', 'REMOTE']

function normalizedSkill(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function jobToDraftInput(job: Job): JobDraftInput {
  return {
    title: job.title,
    department: job.department,
    description: job.description,
    positionsCount: job.positionsCount,
    employmentType: job.employmentType,
    workArrangement: job.workArrangement,
    location: job.location ?? '',
    minimumExperienceYears: job.minimumExperienceYears,
    requiredSkills: job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED').map((skill) => skill.name),
    preferredSkills: job.requiredSkills.filter((skill) => skill.priority === 'PREFERRED').map((skill) => skill.name),
    applicationDeadline: job.applicationDeadline ?? '',
  }
}

export function draftSkillsToRequirements(input: JobDraftInput, existing: SkillRequirement[] = []): SkillRequirement[] {
  const existingByName = new Map(existing.map((skill) => [normalizedSkill(skill.name), skill]))
  return [
    ...input.requiredSkills.map((name) => ({ ...existingByName.get(normalizedSkill(name)), name: name.trim().replace(/\s+/g, ' '), priority: 'REQUIRED' as const })),
    ...input.preferredSkills.map((name) => ({ ...existingByName.get(normalizedSkill(name)), name: name.trim().replace(/\s+/g, ' '), priority: 'PREFERRED' as const })),
  ]
}

export function validateJobDraft(input: JobDraftInput): JobValidationResult {
  const errors: Record<string, string> = {}
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title) errors.title = 'Enter a job title.'
  else if (title.length < 3) errors.title = 'Job title must be at least 3 characters.'
  if (!input.department.trim()) errors.department = 'Enter a department.'
  if (!description) errors.description = 'Enter a job description.'
  else if (description.length < 30) errors.description = 'Description must be at least 30 characters.'
  if (!Number.isInteger(input.positionsCount) || input.positionsCount < 1) errors.positionsCount = 'Positions must be a whole number of at least 1.'
  if (!employmentTypes.includes(input.employmentType)) errors.employmentType = 'Select a valid employment type.'
  if (!workArrangements.includes(input.workArrangement)) errors.workArrangement = 'Select a valid work arrangement.'
  if (input.workArrangement !== 'REMOTE' && !input.location.trim()) errors.location = 'Location is required for on-site and hybrid roles.'
  if (!Number.isFinite(input.minimumExperienceYears) || input.minimumExperienceYears < 0) errors.minimumExperienceYears = 'Minimum experience must be zero or greater.'

  const requiredNormalized = input.requiredSkills.map(normalizedSkill)
  const preferredNormalized = input.preferredSkills.map(normalizedSkill)
  if (input.requiredSkills.length === 0) errors.requiredSkills = 'Add at least one required skill.'
  else if (input.requiredSkills.length > 20) errors.requiredSkills = 'Use no more than 20 required skills.'
  else if (requiredNormalized.some((skill) => !skill)) errors.requiredSkills = 'Required skills cannot be empty.'
  else if (new Set(requiredNormalized).size !== requiredNormalized.length) errors.requiredSkills = 'Required skills must be unique.'
  if (input.preferredSkills.length > 20) errors.preferredSkills = 'Use no more than 20 preferred skills.'
  else if (preferredNormalized.some((skill) => !skill)) errors.preferredSkills = 'Preferred skills cannot be empty.'
  else if (new Set(preferredNormalized).size !== preferredNormalized.length) errors.preferredSkills = 'Preferred skills must be unique.'
  if (preferredNormalized.some((skill) => requiredNormalized.includes(skill))) errors.preferredSkills = 'Required and preferred skills cannot overlap.'

  if (input.applicationDeadline && Number.isNaN(Date.parse(`${input.applicationDeadline}T23:59:59`))) errors.applicationDeadline = 'Enter a valid application deadline.'
  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateJob(job: Job): JobValidationResult {
  return validateJobDraft(jobToDraftInput(job))
}

export function createNextJobId(jobs: Job[]): string {
  const largest = jobs.reduce((max, job) => {
    const match = /^job-(\d+)$/.exec(job.id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `job-${String(largest + 1).padStart(3, '0')}`
}

export function selectJobRelatedRecordCounts(state: DemoState, jobId: string): JobRelatedRecordCounts {
  const applicationIds = new Set(state.applications.filter((application) => application.jobId === jobId).map((application) => application.id))
  return {
    applications: applicationIds.size,
    applicationForms: state.applicationForms.filter((form) => form.jobId === jobId).length,
    rubrics: state.rubrics.filter((rubric) => rubric.jobId === jobId).length,
    evaluations: state.evaluations.filter((evaluation) => applicationIds.has(evaluation.applicationId)).length,
    interviews: state.interviews.filter((interview) => applicationIds.has(interview.applicationId)).length,
    decisions: state.decisions.filter((decision) => applicationIds.has(decision.applicationId)).length,
    screeningQueue: state.screeningQueue.filter((item) => item.jobId === jobId || applicationIds.has(item.applicationId)).length,
    schedulingInvitations: state.interviewSchedulingInvitations.filter((invitation) => invitation.jobId === jobId || applicationIds.has(invitation.applicationId)).length,
    schedulingPolicies: state.interviewSchedulingPolicies.filter((policy) => policy.jobId === jobId).length,
  }
}

export function canDeleteJob(state: DemoState, jobId: string): JobDeletionCheck {
  const job = state.jobs.find((item) => item.id === jobId)
  if (!job) return { allowed: false, reasons: ['The job does not exist.'] }
  const counts = selectJobRelatedRecordCounts(state, jobId)
  const reasons: string[] = []
  if (job.status === 'OPEN') reasons.push('Open jobs must be closed before they can be deleted.')
  const labels: Array<[keyof JobRelatedRecordCounts, string]> = [
    ['applications', 'candidate applications'], ['applicationForms', 'application forms'], ['rubrics', 'screening rubrics'],
    ['evaluations', 'evaluations'], ['interviews', 'interviews'], ['decisions', 'recruiter decisions'],
    ['screeningQueue', 'screening queue records'], ['schedulingInvitations', 'scheduling invitations'], ['schedulingPolicies', 'scheduling policies'],
  ]
  for (const [key, label] of labels) if (counts[key] > 0) reasons.push(`This job has ${label}.`)
  return { allowed: reasons.length === 0, reasons }
}

export function evaluateJobReadiness(state: DemoState, jobId: string): JobReadinessResult {
  const job = state.jobs.find((item) => item.id === jobId)
  if (!job) return { status: 'JOB_DETAILS_INCOMPLETE', ready: false, issues: ['Job details could not be found.'] }
  const validation = validateJob(job)
  if (!validation.valid) return { status: 'JOB_DETAILS_INCOMPLETE', ready: false, issues: Object.values(validation.errors) }
  const publishedForm = state.applicationForms.some((form) => form.jobId === jobId && form.status === 'PUBLISHED')
  if (!publishedForm) return { status: 'APPLICATION_FORM_REQUIRED', ready: false, issues: ['Publish an application form before opening this job.'] }
  const publishedRubric = state.rubrics.some((rubric) => rubric.jobId === jobId && rubric.status === 'PUBLISHED')
  if (!publishedRubric) return { status: 'SCREENING_SETUP_REQUIRED', ready: false, issues: ['Publish a screening rubric before opening this job.'] }
  if (job.applicationDeadline) {
    const deadline = new Date(`${job.applicationDeadline}T23:59:59`)
    if (Number.isNaN(deadline.getTime())) return { status: 'JOB_DETAILS_INCOMPLETE', ready: false, issues: ['Enter a valid application deadline.'] }
  }
  return { status: job.status === 'OPEN' ? 'OPEN' : 'READY', ready: true, issues: [] }
}

export function canOpenJob(state: DemoState, jobId: string, changedAt: string): JobReadinessResult {
  const readiness = evaluateJobReadiness(state, jobId)
  if (!readiness.ready) return readiness
  const job = state.jobs.find((item) => item.id === jobId)
  if (job?.applicationDeadline && new Date(`${job.applicationDeadline}T23:59:59`).getTime() <= new Date(changedAt).getTime()) {
    return { status: 'JOB_DETAILS_INCOMPLETE', ready: false, issues: ['Choose a future application deadline before opening this job.'] }
  }
  return readiness
}

export function isValidJobTransition(from: JobStatus, to: JobStatus) {
  return (from === 'DRAFT' && (to === 'OPEN' || to === 'ARCHIVED')) ||
    (from === 'OPEN' && to === 'CLOSED') ||
    (from === 'CLOSED' && (to === 'OPEN' || to === 'ARCHIVED')) ||
    (from === 'ARCHIVED' && to === 'DRAFT')
}

export function canAcceptPublicApplications(job: Job, hasPublishedForm: boolean) {
  return job.status === 'OPEN' && hasPublishedForm
}

import type { DemoState } from '../store/demoStateTypes'
import type { EmploymentType, Job, JobStatus, SkillRequirement, WorkArrangement } from '../types/job'
import type { JobDraftInput } from '../types/jobDraft'
import { z } from 'zod'

export type JobValidationResult = { valid: boolean; errors: Record<string, string>; data?: JobDraftInput }
export type JobDraftField = keyof JobDraftInput
export const jobDraftFieldOrder: JobDraftField[] = ['title', 'department', 'description', 'positionsCount', 'employmentType', 'workArrangement', 'location', 'minimumExperienceYears', 'requiredSkills', 'preferredSkills', 'applicationDeadline']
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

export const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY'] as const satisfies readonly EmploymentType[]
export const workArrangements = ['ONSITE', 'HYBRID', 'REMOTE'] as const satisfies readonly WorkArrangement[]

function normalizedSkill(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const unique = new Map<string, string>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const displayValue = item.trim().replace(/\s+/g, ' ')
    const key = normalizedSkill(displayValue)
    if (displayValue && !unique.has(key)) unique.set(key, displayValue)
  }
  return [...unique.values()]
}

const skillListSchema = z.preprocess(normalizeSkills, z.array(z.string()))

function parseDateOnly(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined
}

export function createJobDraftSchema(now = new Date()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  return z.object({
    title: z.string().trim().min(1, 'Enter a job title.').min(2, 'Job title must be at least 2 characters.'),
    department: z.string().trim().min(1, 'Enter a department.'),
    description: z.string().trim().min(1, 'Enter a job description.').min(30, 'Description must be at least 30 characters.'),
    positionsCount: z.number().int('Positions must be a whole number of at least 1.').min(1, 'Positions must be a whole number of at least 1.'),
    employmentType: z.enum(employmentTypes),
    workArrangement: z.enum(workArrangements),
    location: z.string().trim(),
    minimumExperienceYears: z.number().finite().min(0, 'Minimum experience must be zero or greater.'),
    requiredSkills: skillListSchema.pipe(z.array(z.string()).min(1, 'Add at least one required skill.').max(20, 'Use no more than 20 required skills.')),
    preferredSkills: skillListSchema.pipe(z.array(z.string()).max(20, 'Use no more than 20 preferred skills.')),
    applicationDeadline: z.string().trim().refine((value) => !value || Boolean(parseDateOnly(value)), 'Enter a valid application deadline.').refine((value) => !value || (parseDateOnly(value)?.getTime() ?? Number.NEGATIVE_INFINITY) > today.getTime(), 'Choose a future application deadline.'),
  }).superRefine((input, context) => {
    if (input.workArrangement !== 'REMOTE' && !input.location) {
      context.addIssue({ code: 'custom', path: ['location'], message: 'Location is required for on-site and hybrid roles.' })
    }
    const required = new Set(input.requiredSkills.map(normalizedSkill))
    if (input.preferredSkills.some((skill) => required.has(normalizedSkill(skill)))) {
      context.addIssue({ code: 'custom', path: ['preferredSkills'], message: 'Required and preferred skills cannot overlap.' })
    }
  })
}

export const jobDraftSchema = createJobDraftSchema()

const fallbackFieldMessages: Partial<Record<keyof JobDraftInput, string>> = {
  title: 'Enter a valid job title.',
  department: 'Enter a department.',
  description: 'Enter a valid job description.',
  positionsCount: 'Enter a valid number of positions.',
  employmentType: 'Select an employment type.',
  workArrangement: 'Select a work arrangement.',
  location: 'Enter a valid location.',
  minimumExperienceYears: 'Enter valid minimum experience.',
  requiredSkills: 'Add at least one required skill.',
  preferredSkills: 'Review the preferred skills.',
  applicationDeadline: 'Enter a valid application deadline.',
}

export function jobDraftIssuesToFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field !== 'string' || errors[field]) continue
    const friendly = fallbackFieldMessages[field as keyof JobDraftInput]
    errors[field] = issue.code === 'invalid_type' || issue.code === 'invalid_value'
      ? friendly ?? 'Review this field.'
      : issue.message
  }
  return errors
}

export function getOrderedJobDraftIssues(errors: Record<string, string>): Array<{ field: JobDraftField; message: string }> {
  const seen = new Set<string>()
  return jobDraftFieldOrder.flatMap((field) => {
    const message = errors[field]
    if (!message || seen.has(message)) return []
    seen.add(message)
    return [{ field, message }]
  })
}

export function validateJobDraftSubmission(input: JobDraftInput, now = new Date()) {
  const result = createJobDraftSchema(now).safeParse(input)
  if (result.success) return { valid: true as const, data: result.data, errors: {}, orderedIssues: [], shouldOpenDialog: false }
  const errors = jobDraftIssuesToFieldErrors(result.error.issues)
  return { valid: false as const, errors, orderedIssues: getOrderedJobDraftIssues(errors), shouldOpenDialog: true }
}

export function reconcileJobDraftFieldErrors(current: Record<string, string>, input: JobDraftInput, now = new Date()) {
  const next = validateJobDraft(input, now).errors
  return Object.fromEntries(Object.entries(current).map(([field, message]) => [field, message && next[field] ? next[field] : '']))
}

export type JobDraftFocusableControl = {
  scrollIntoView: (options: ScrollIntoViewOptions) => void
  focus: (options?: FocusOptions) => void
}

export function focusJobDraftControl(
  field: JobDraftField,
  controls: Record<JobDraftField, { current: JobDraftFocusableControl | null }>,
  schedule: (callback: () => void) => unknown = (callback) => window.requestAnimationFrame(callback),
) {
  const element = controls[field].current
  if (!element) return false
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  schedule(() => element.focus({ preventScroll: true }))
  return true
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

export function validateJobDraft(input: JobDraftInput, now = new Date()): JobValidationResult {
  const result = validateJobDraftSubmission(input, now)
  return result.valid ? { valid: true, errors: {}, data: result.data } : { valid: false, errors: result.errors }
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

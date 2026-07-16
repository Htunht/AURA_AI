import { demoReducer, initialDemoState, type DemoAction, type DemoState } from '../store/demoReducer'
import { selectDashboardMetrics, selectJobReadiness, selectJobsByStatus } from '../store/demoSelectors'
import type { Application } from '../types/application'
import type { Job } from '../types/job'
import type { JobDraftInput } from '../types/jobDraft'
import { canAcceptPublicApplications, canDeleteJob, createNextJobId, draftSkillsToRequirements, validateJobDraft } from './jobValidation'

export type JobCrudValidationResult = { valid: boolean; errors: string[] }
const check = (errors: string[], condition: boolean, message: string) => { if (!condition) errors.push(message) }

const validInput: JobDraftInput = {
  title: 'Product Operations Manager', department: 'Operations',
  description: 'Lead reliable product operations and improve cross-functional delivery across the AURA recruitment platform.',
  positionsCount: 1, employmentType: 'FULL_TIME', workArrangement: 'HYBRID', location: 'Yangon',
  minimumExperienceYears: 3, requiredSkills: ['Product operations', 'Stakeholder management'], preferredSkills: ['Recruitment technology'],
  applicationDeadline: '2026-08-30',
}

function createFixture(id: string, status: Job['status'] = 'DRAFT'): Job {
  return { id, title: validInput.title, department: validInput.department, description: validInput.description, status, positionsCount: validInput.positionsCount, employmentType: validInput.employmentType, workArrangement: validInput.workArrangement, location: validInput.location, minimumExperienceYears: validInput.minimumExperienceYears, requiredSkills: draftSkillsToRequirements(validInput), applicationDeadline: validInput.applicationDeadline, createdAt: '2026-07-16T10:00:00.000Z', updatedAt: '2026-07-16T10:00:00.000Z' }
}

export function validateJobCrudDomain(): JobCrudValidationResult {
  const errors: string[] = []
  const initialSnapshot = JSON.stringify(initialDemoState)
  check(errors, createNextJobId(initialDemoState.jobs) === 'job-004', 'Next job ID is not deterministic')
  check(errors, createNextJobId([...initialDemoState.jobs, createFixture('job-009')]) === 'job-010', 'Next job ID used array length instead of the largest suffix')
  check(errors, validateJobDraft(validInput).valid, 'Valid job draft failed validation')
  check(errors, !validateJobDraft({ ...validInput, title: 'A' }).valid, 'Invalid short title was accepted')
  check(errors, !validateJobDraft({ ...validInput, description: 'Too short' }).valid, 'Short description was accepted')
  check(errors, !validateJobDraft({ ...validInput, positionsCount: 0 }).valid, 'Invalid position count was accepted')
  check(errors, !validateJobDraft({ ...validInput, requiredSkills: [] }).valid, 'Job without a required skill was accepted')
  check(errors, !validateJobDraft({ ...validInput, requiredSkills: ['React', ' react '] }).valid, 'Duplicate required skills were accepted')
  check(errors, !validateJobDraft({ ...validInput, requiredSkills: ['React'], preferredSkills: ['REACT'] }).valid, 'Required/preferred overlap was accepted')
  check(errors, !validateJobDraft({ ...validInput, workArrangement: 'ONSITE', location: '' }).valid, 'On-site job without location was accepted')
  check(errors, validateJobDraft({ ...validInput, workArrangement: 'REMOTE', location: '' }).valid, 'Remote job with no location was rejected')

  const job = createFixture('job-004')
  let state = demoReducer(initialDemoState, { type: 'ADD_JOB', payload: { job } })
  check(errors, state.jobs.some((item) => item.id === job.id && item.status === 'DRAFT'), 'Valid draft job was not added')
  check(errors, demoReducer(state, { type: 'ADD_JOB', payload: { job } }) === state, 'Duplicate job ID was accepted')
  check(errors, demoReducer(state, { type: 'ADD_JOB', payload: { job: { ...job, id: 'job-invalid', title: 'A' } } }) === state, 'Invalid job was added')

  state = demoReducer(state, { type: 'UPDATE_JOB', payload: { jobId: job.id, changes: { title: 'Senior Product Operations Manager' }, updatedAt: '2026-07-16T11:00:00.000Z' } })
  const updated = state.jobs.find((item) => item.id === job.id)
  check(errors, updated?.id === job.id && updated.status === 'DRAFT' && updated.title.startsWith('Senior'), 'Valid update did not preserve job identity and status')
  const directStatusAction = { type: 'UPDATE_JOB', payload: { jobId: job.id, changes: { status: 'OPEN' }, updatedAt: '2026-07-16T11:01:00.000Z' } } as unknown as DemoAction
  state = demoReducer(state, directStatusAction)
  check(errors, state.jobs.find((item) => item.id === job.id)?.status === 'DRAFT', 'UPDATE_JOB allowed a direct status edit')
  check(errors, demoReducer(state, { type: 'UPDATE_JOB', payload: { jobId: job.id, changes: { title: 'A' }, updatedAt: '2026-07-16T11:02:00.000Z' } }) === state, 'Invalid job update was accepted')

  check(errors, selectJobReadiness(state, job.id).status === 'APPLICATION_FORM_REQUIRED', 'Missing application form readiness issue is incorrect')
  check(errors, demoReducer(state, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'OPEN', changedAt: '2026-07-16T12:00:00.000Z' } }) === state, 'Unready draft job opened')

  const sourceForm = initialDemoState.applicationForms.find((form) => form.status === 'PUBLISHED')
  const sourceRubric = initialDemoState.rubrics.find((rubric) => rubric.status === 'PUBLISHED')
  if (!sourceForm || !sourceRubric) return { valid: false, errors: ['Job CRUD validation could not resolve setup fixtures.'] }
  const readyState: DemoState = { ...state, applicationForms: [...state.applicationForms, { ...sourceForm, id: 'form-job-004', jobId: job.id, fields: sourceForm.fields.map((field) => ({ ...field })) }], rubrics: [...state.rubrics, { ...sourceRubric, id: 'rubric-job-004', jobId: job.id, criteria: sourceRubric.criteria.map((criterion) => ({ ...criterion })) }] }
  check(errors, selectJobReadiness(readyState, job.id).ready, 'Configured draft job was not ready')
  const opened = demoReducer(readyState, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'OPEN', changedAt: '2026-07-16T12:00:00.000Z' } })
  check(errors, opened.jobs.find((item) => item.id === job.id)?.status === 'OPEN', 'DRAFT to OPEN failed for a ready job')
  check(errors, Boolean(opened.jobs.find((item) => item.id === job.id)?.openedAt), 'Opening did not set openedAt')
  const closed = demoReducer(opened, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'CLOSED', changedAt: '2026-07-16T13:00:00.000Z' } })
  check(errors, closed.jobs.find((item) => item.id === job.id)?.status === 'CLOSED', 'OPEN to CLOSED failed')
  const reopened = demoReducer(closed, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'OPEN', changedAt: '2026-07-16T14:00:00.000Z' } })
  check(errors, reopened.jobs.find((item) => item.id === job.id)?.status === 'OPEN' && !reopened.jobs.find((item) => item.id === job.id)?.closedAt, 'CLOSED to OPEN did not reopen cleanly')
  check(errors, demoReducer(opened, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'DRAFT', changedAt: '2026-07-16T14:00:00.000Z' } }) === opened, 'Invalid OPEN to DRAFT transition was accepted')

  const draftArchived = demoReducer(state, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'ARCHIVED', changedAt: '2026-07-16T15:00:00.000Z' } })
  check(errors, draftArchived.jobs.find((item) => item.id === job.id)?.status === 'ARCHIVED', 'DRAFT to ARCHIVED failed')
  const restored = demoReducer(draftArchived, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'DRAFT', changedAt: '2026-07-16T16:00:00.000Z' } })
  check(errors, restored.jobs.find((item) => item.id === job.id)?.status === 'DRAFT' && !restored.jobs.find((item) => item.id === job.id)?.archivedAt, 'ARCHIVED to DRAFT did not restore cleanly')
  const closedArchived = demoReducer(closed, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'ARCHIVED', changedAt: '2026-07-16T16:00:00.000Z' } })
  check(errors, closedArchived.jobs.find((item) => item.id === job.id)?.status === 'ARCHIVED', 'CLOSED to ARCHIVED failed')
  check(errors, demoReducer(draftArchived, { type: 'CHANGE_JOB_STATUS', payload: { jobId: job.id, status: 'OPEN', changedAt: '2026-07-16T17:00:00.000Z' } }) === draftArchived, 'Invalid ARCHIVED to OPEN transition was accepted')

  const unused = createFixture('job-020')
  const withUnused = demoReducer(initialDemoState, { type: 'ADD_JOB', payload: { job: unused } })
  check(errors, canDeleteJob(withUnused, unused.id).allowed, 'Unused draft job was not deletable')
  check(errors, !demoReducer(withUnused, { type: 'DELETE_JOB', payload: { jobId: unused.id } }).jobs.some((item) => item.id === unused.id), 'Safe unused job was not deleted')
  const sourceApplication = initialDemoState.applications[0]
  if (!sourceApplication) return { valid: false, errors: ['Job CRUD validation could not resolve an application fixture.'] }
  const relatedApplication: Application = { ...sourceApplication, id: 'application-job-020', jobId: unused.id }
  const withApplication: DemoState = { ...withUnused, applications: [...withUnused.applications, relatedApplication] }
  check(errors, !canDeleteJob(withApplication, unused.id).allowed && demoReducer(withApplication, { type: 'DELETE_JOB', payload: { jobId: unused.id } }) === withApplication, 'Job with an application was deleted')
  const withForm: DemoState = { ...withUnused, applicationForms: [...withUnused.applicationForms, { ...sourceForm, id: 'form-job-020', jobId: unused.id }] }
  check(errors, !canDeleteJob(withForm, unused.id).allowed, 'Job with an application form was deletable')
  const sourceInterview = initialDemoState.interviews[0]
  if (sourceInterview) {
    const withInterview: DemoState = { ...withApplication, interviews: [...withApplication.interviews, { ...sourceInterview, id: 'interview-job-020', applicationId: relatedApplication.id }] }
    const result = demoReducer(withInterview, { type: 'DELETE_JOB', payload: { jobId: unused.id } })
    check(errors, result === withInterview && result.interviews.some((item) => item.id === 'interview-job-020'), 'Delete cascaded or removed a job with interview history')
  }

  check(errors, canAcceptPublicApplications(opened.jobs.find((item) => item.id === job.id)!, true), 'Open configured job was unavailable publicly')
  check(errors, !canAcceptPublicApplications(job, true) && !canAcceptPublicApplications({ ...job, status: 'CLOSED' }, true) && !canAcceptPublicApplications({ ...job, status: 'ARCHIVED' }, true), 'Public application accepted a non-open job')
  check(errors, selectDashboardMetrics(opened, new Date('2026-07-16')).activeJobs === selectDashboardMetrics(readyState, new Date('2026-07-16')).activeJobs + 1, 'Dashboard active count did not increase after opening')
  check(errors, selectDashboardMetrics(closed, new Date('2026-07-16')).activeJobs === selectDashboardMetrics(readyState, new Date('2026-07-16')).activeJobs, 'Dashboard active count did not decrease after closing')
  check(errors, ['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'].every((status) => Array.isArray(selectJobsByStatus(closedArchived, status as Job['status']))), 'Job status selectors do not support every lifecycle status')
  check(errors, JSON.stringify(initialDemoState) === initialSnapshot, 'Job CRUD validation mutated initial state')
  try { JSON.stringify(closedArchived) } catch { errors.push('Job CRUD state is not JSON serializable') }
  return { valid: errors.length === 0, errors }
}

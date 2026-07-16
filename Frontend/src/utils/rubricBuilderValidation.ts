import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import { findApplicationsRequiringAutomaticScreening, selectPublishedRubricByJobId } from '../store/demoSelectors'
import type { Application } from '../types/application'
import { generateRubricDraft, validateRubricDraft } from './rubricBuilder'

export type RubricBuilderValidationResult = { valid: boolean; errors: string[] }

function check(errors: string[], condition: boolean, message: string) {
  if (!condition) errors.push(message)
}

export function validateRubricBuilderDomain(): RubricBuilderValidationResult {
  const errors: string[] = []
  const snapshot = JSON.stringify(initialDemoState)
  const job = initialDemoState.jobs.find((item) => !selectPublishedRubricByJobId(initialDemoState, item.id))
  if (!job) return { valid: false, errors: ['Rubric builder validation requires a job without a published rubric.'] }

  const timestamp = '2026-07-16T12:00:00.000Z'
  const draft = generateRubricDraft(job, initialDemoState.rubrics, timestamp)
  check(errors, draft.status === 'DRAFT' && draft.version === 1, 'Generated rubric was not a versioned draft')
  check(errors, draft.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) === 100, 'Generated rubric weights do not total 100')
  check(errors, job.requiredSkills.length === 0 || draft.criteria.some((criterion) => job.requiredSkills.some((skill) => criterion.description.includes(skill.name))), 'Generated rubric does not use job requirements')
  check(errors, validateRubricDraft(draft).valid, 'Generated rubric did not pass publish validation')

  const sourceApplication = initialDemoState.applications[0]
  if (!sourceApplication) return { valid: false, errors: ['Rubric builder validation requires an application fixture.'] }
  const application: Application = { ...sourceApplication, id: 'application-rubric-validation', jobId: job.id, candidateId: sourceApplication.candidateId, submittedAt: timestamp, currentStage: 'APPLICATION' }
  let state: DemoState = { ...initialDemoState, applications: [...initialDemoState.applications, application] }
  check(errors, !findApplicationsRequiringAutomaticScreening(state).includes(application.id), 'Application without a published rubric entered automatic screening')
  state = demoReducer(state, { type: 'QUEUE_SCREENING_APPLICATION', payload: { applicationId: application.id, queuedAt: timestamp } })
  check(errors, !state.screeningQueue.some((item) => item.applicationId === application.id), 'Reducer queued an application without a published rubric')
  state = demoReducer(state, { type: 'ADD_RUBRIC', payload: { rubric: draft } })
  state = demoReducer(state, { type: 'PUBLISH_RUBRIC', payload: { rubricId: draft.id, updatedAt: timestamp } })
  check(errors, selectPublishedRubricByJobId(state, job.id)?.id === draft.id, 'Valid draft was not published')
  check(errors, findApplicationsRequiringAutomaticScreening(state).includes(application.id), 'Publishing a rubric did not make the application eligible for automatic screening')

  const versionTwo = generateRubricDraft(job, state.rubrics, '2026-07-16T12:05:00.000Z')
  state = demoReducer(state, { type: 'ADD_RUBRIC', payload: { rubric: versionTwo } })
  state = demoReducer(state, { type: 'PUBLISH_RUBRIC', payload: { rubricId: versionTwo.id, updatedAt: versionTwo.updatedAt } })
  check(errors, state.rubrics.find((item) => item.id === draft.id)?.status === 'ARCHIVED' && selectPublishedRubricByJobId(state, job.id)?.id === versionTwo.id, 'Publishing a new version did not archive the previous rubric')
  check(errors, JSON.stringify(initialDemoState) === snapshot, 'Rubric builder validation mutated initial state')
  return { valid: errors.length === 0, errors }
}

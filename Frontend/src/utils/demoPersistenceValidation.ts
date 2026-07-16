import { createFreshDemoState, normalizePersistedDemoState } from '../store/demoPersistence'
import {
  demoReducer,
  initialDemoState,
  type DemoState,
} from '../store/demoReducer'
import { validateApplicationFormDomain } from './applicationFormDomainValidation'
import { validateDemoData } from './demoDataValidation'
import { validateDemoStore } from './demoStoreValidation'
import { validatePersistedDemoState } from './persistedDemoStateValidation'

export type DemoPersistenceValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) {
    errors.push(message)
  }
}

export function validateDemoPersistence(): DemoPersistenceValidationResult {
  const errors: string[] = []
  const collectionNames: Array<keyof DemoState> = [
    'jobs',
    'candidates',
    'applications',
    'applicationForms',
    'rubrics',
    'evaluations',
    'interviews',
    'interviewSchedulingPolicies',
    'interviewSchedulingInvitations',
    'transcripts',
    'communications',
    'decisions',
    'screeningQueue',
  ]
  const freshState = createFreshDemoState()

  recordCheck(
    errors,
    freshState !== initialDemoState,
    'Fresh demo state shares its top-level object with initialDemoState',
  )

  for (const collectionName of collectionNames) {
    recordCheck(
      errors,
      freshState[collectionName].length ===
        initialDemoState[collectionName].length,
      `Fresh ${collectionName} count does not match initialDemoState`,
    )
    recordCheck(
      errors,
      freshState[collectionName] !== initialDemoState[collectionName],
      `Fresh ${collectionName} shares its array with initialDemoState`,
    )
  }

  const initialJobCount = initialDemoState.jobs.length
  freshState.jobs.pop()
  recordCheck(
    errors,
    initialDemoState.jobs.length === initialJobCount,
    'Mutating a fresh jobs array mutated initialDemoState',
  )

  const nestedFreshState = createFreshDemoState()
  const freshField = nestedFreshState.applicationForms[0]?.fields[0]
  const seedField = initialDemoState.applicationForms[0]?.fields[0]
  const originalSeedLabel = seedField?.label

  if (freshField) {
    freshField.label = 'Persistence clone validation label'
  }

  recordCheck(
    errors,
    Boolean(freshField && seedField) && seedField?.label === originalSeedLabel,
    'Mutating a nested fresh form field mutated initialDemoState',
  )

  const currentValidation = validatePersistedDemoState(initialDemoState)
  recordCheck(
    errors,
    currentValidation.valid,
    `Current demo state failed persistence validation: ${currentValidation.errors.join('; ')}`,
  )

  const legacyState = { ...createFreshDemoState() }
  delete (legacyState as Partial<DemoState>).interviewSchedulingPolicies
  delete (legacyState as Partial<DemoState>).interviewSchedulingInvitations
  const hydratedLegacy = normalizePersistedDemoState(legacyState)
  recordCheck(
    errors,
    hydratedLegacy.interviewSchedulingPolicies.length === initialDemoState.interviewSchedulingPolicies.length &&
      hydratedLegacy.interviewSchedulingInvitations.length === 0,
    'Older persisted state did not hydrate scheduling policies and invitations',
  )

  const missingCollection: Record<string, unknown> = {
    ...createFreshDemoState(),
  }
  delete missingCollection.decisions
  recordCheck(
    errors,
    !validatePersistedDemoState(missingCollection).valid,
    'Persisted validation accepted a missing collection',
  )

  recordCheck(
    errors,
    !validatePersistedDemoState({
      ...createFreshDemoState(),
      jobs: {},
    }).valid,
    'Persisted validation accepted a non-array collection',
  )

  const malformedFormState = createFreshDemoState()
  const malformedForms: unknown[] = malformedFormState.applicationForms.map(
    (form, index) => (index === 0 ? { ...form, fields: 'invalid' } : form),
  )
  recordCheck(
    errors,
    !validatePersistedDemoState({
      ...malformedFormState,
      applicationForms: malformedForms,
    }).valid,
    'Persisted validation accepted a malformed application form',
  )

  const brokenReferenceState = createFreshDemoState()
  const applicationsWithBrokenReference = brokenReferenceState.applications.map(
    (application, index) =>
      index === 0 ? { ...application, jobId: 'missing-job' } : application,
  )
  recordCheck(
    errors,
    !validatePersistedDemoState({
      ...brokenReferenceState,
      applications: applicationsWithBrokenReference,
    }).valid,
    'Persisted validation accepted an invalid application job reference',
  )

  let parsedState: unknown

  try {
    parsedState = JSON.parse(JSON.stringify(createFreshDemoState()))
    recordCheck(
      errors,
      validatePersistedDemoState(parsedState).valid,
      'Serialized and parsed demo state failed persistence validation',
    )
  } catch {
    errors.push('Full demo state could not be serialized and parsed')
  }

  const previousState = createFreshDemoState()
  const resetState = demoReducer(previousState, { type: 'RESET_DEMO_STATE' })
  recordCheck(
    errors,
    resetState !== previousState,
    'RESET_DEMO_STATE returned the previous state object',
  )

  for (const collectionName of collectionNames) {
    recordCheck(
      errors,
      resetState[collectionName].length ===
        initialDemoState[collectionName].length,
      `RESET_DEMO_STATE returned an invalid ${collectionName} count`,
    )
  }

  const demoDataValidation = validateDemoData()
  const demoStoreValidation = validateDemoStore()
  const applicationFormValidation = validateApplicationFormDomain()

  recordCheck(
    errors,
    demoDataValidation.valid,
    `Existing demo data validation failed: ${demoDataValidation.errors.join('; ')}`,
  )
  recordCheck(
    errors,
    demoStoreValidation.valid,
    `Existing demo store validation failed: ${demoStoreValidation.errors.join('; ')}`,
  )
  recordCheck(
    errors,
    applicationFormValidation.valid,
    `Existing application form validation failed: ${applicationFormValidation.errors.join('; ')}`,
  )

  return { valid: errors.length === 0, errors }
}

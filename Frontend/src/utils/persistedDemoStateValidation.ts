export type PersistedDemoStateValidationResult = {
  valid: boolean
  errors: string[]
}

const collectionNames = [
  'jobs',
  'candidates',
  'applications',
  'applicationForms',
  'rubrics',
  'evaluations',
  'interviews',
  'transcripts',
  'communications',
  'decisions',
] as const

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStringProperties(
  value: UnknownRecord,
  properties: readonly string[],
): boolean {
  return properties.every((property) => typeof value[property] === 'string')
}

function validateRecords(
  collection: unknown[],
  collectionName: string,
  validate: (record: UnknownRecord) => boolean,
  errors: string[],
) {
  collection.forEach((value, index) => {
    if (!isRecord(value) || !validate(value)) {
      errors.push(`${collectionName}[${index}] has an invalid record shape.`)
    }
  })
}

function stringIds(collection: unknown[]): Set<string> {
  return new Set(
    collection.flatMap((value) =>
      isRecord(value) && typeof value.id === 'string' ? [value.id] : [],
    ),
  )
}

function validateReference(
  collection: unknown[],
  collectionName: string,
  property: string,
  referencedIds: Set<string>,
  errors: string[],
) {
  collection.forEach((value, index) => {
    if (
      isRecord(value) &&
      typeof value[property] === 'string' &&
      !referencedIds.has(value[property])
    ) {
      errors.push(
        `${collectionName}[${index}].${property} references a missing record.`,
      )
    }
  })
}

export function validatePersistedDemoState(
  value: unknown,
): PersistedDemoStateValidationResult {
  const errors: string[] = []

  if (!isRecord(value)) {
    return {
      valid: false,
      errors: ['Persisted demo state must be an object.'],
    }
  }

  for (const collectionName of collectionNames) {
    if (!Array.isArray(value[collectionName])) {
      errors.push(`Persisted demo state ${collectionName} must be an array.`)
    }
  }

  if (
    value.screeningQueue !== undefined &&
    !Array.isArray(value.screeningQueue)
  ) {
    errors.push('Persisted demo state screeningQueue must be an array.')
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  const jobs = value.jobs as unknown[]
  const candidates = value.candidates as unknown[]
  const applications = value.applications as unknown[]
  const applicationForms = value.applicationForms as unknown[]
  const rubrics = value.rubrics as unknown[]
  const evaluations = value.evaluations as unknown[]
  const interviews = value.interviews as unknown[]
  const transcripts = value.transcripts as unknown[]
  const communications = value.communications as unknown[]
  const decisions = value.decisions as unknown[]
  const screeningQueue = Array.isArray(value.screeningQueue)
    ? value.screeningQueue
    : []

  validateRecords(
    jobs,
    'jobs',
    (record) => hasStringProperties(record, ['id', 'title', 'status']),
    errors,
  )
  validateRecords(
    candidates,
    'candidates',
    (record) => hasStringProperties(record, ['id', 'fullName', 'email']),
    errors,
  )
  validateRecords(
    applications,
    'applications',
    (record) =>
      hasStringProperties(record, [
        'id',
        'jobId',
        'candidateId',
        'status',
        'currentStage',
      ]),
    errors,
  )
  validateRecords(
    applicationForms,
    'applicationForms',
    (record) =>
      hasStringProperties(record, ['id', 'jobId', 'status']) &&
      typeof record.version === 'number' &&
      Number.isFinite(record.version) &&
      Array.isArray(record.fields),
    errors,
  )
  validateRecords(
    rubrics,
    'rubrics',
    (record) =>
      hasStringProperties(record, ['id', 'jobId']) &&
      Array.isArray(record.criteria),
    errors,
  )
  validateRecords(
    evaluations,
    'evaluations',
    (record) =>
      hasStringProperties(record, [
        'id',
        'applicationId',
        'evaluationType',
        'status',
      ]),
    errors,
  )
  validateRecords(
    interviews,
    'interviews',
    (record) =>
      hasStringProperties(record, ['id', 'applicationId']) &&
      Array.isArray(record.questions),
    errors,
  )
  validateRecords(
    transcripts,
    'transcripts',
    (record) =>
      hasStringProperties(record, ['id', 'interviewId']) &&
      Array.isArray(record.segments),
    errors,
  )
  validateRecords(
    communications,
    'communications',
    (record) =>
      hasStringProperties(record, ['id', 'applicationId', 'status']),
    errors,
  )
  validateRecords(
    decisions,
    'decisions',
    (record) => hasStringProperties(record, ['id', 'applicationId']),
    errors,
  )
  validateRecords(
    screeningQueue,
    'screeningQueue',
    (record) =>
      hasStringProperties(record, [
        'id',
        'applicationId',
        'jobId',
        'status',
        'queuedAt',
      ]) &&
      typeof record.attemptCount === 'number' &&
      Number.isInteger(record.attemptCount) &&
      record.attemptCount >= 0 &&
      ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(
        record.status as string,
      ) &&
      (record.startedAt === undefined ||
        typeof record.startedAt === 'string') &&
      (record.completedAt === undefined ||
        typeof record.completedAt === 'string') &&
      (record.error === undefined || typeof record.error === 'string'),
    errors,
  )

  const jobIds = stringIds(jobs)
  const candidateIds = stringIds(candidates)
  const applicationIds = stringIds(applications)
  const interviewIds = stringIds(interviews)

  validateReference(applications, 'applications', 'jobId', jobIds, errors)
  validateReference(
    applications,
    'applications',
    'candidateId',
    candidateIds,
    errors,
  )
  validateReference(applicationForms, 'applicationForms', 'jobId', jobIds, errors)
  validateReference(rubrics, 'rubrics', 'jobId', jobIds, errors)
  validateReference(
    evaluations,
    'evaluations',
    'applicationId',
    applicationIds,
    errors,
  )
  validateReference(
    interviews,
    'interviews',
    'applicationId',
    applicationIds,
    errors,
  )
  validateReference(
    transcripts,
    'transcripts',
    'interviewId',
    interviewIds,
    errors,
  )
  validateReference(
    communications,
    'communications',
    'applicationId',
    applicationIds,
    errors,
  )
  validateReference(
    decisions,
    'decisions',
    'applicationId',
    applicationIds,
    errors,
  )
  validateReference(
    screeningQueue,
    'screeningQueue',
    'applicationId',
    applicationIds,
    errors,
  )
  validateReference(
    screeningQueue,
    'screeningQueue',
    'jobId',
    jobIds,
    errors,
  )

  return { valid: errors.length === 0, errors }
}

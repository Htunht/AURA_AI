import applicationsData from '../data/applications.json'
import applicationFormsData from '../data/applicationForms.json'
import candidatesData from '../data/candidates.json'
import communicationsData from '../data/communications.json'
import evaluationsData from '../data/evaluations.json'
import interviewsData from '../data/interviews.json'
import jobsData from '../data/jobs.json'
import rubricsData from '../data/rubrics.json'
import transcriptsData from '../data/transcripts.json'
import type { Application } from '../types/application'
import type { ApplicationForm } from '../types/applicationForm'
import type { Candidate } from '../types/candidate'
import type { Communication } from '../types/communication'
import type {
  Evaluation,
  EvidenceReference,
} from '../types/evaluation'
import type { Interview } from '../types/interview'
import type { Job } from '../types/job'
import type { EvaluationRubric } from '../types/rubric'
import type { Transcript } from '../types/transcript'
import {
  validateApplicationForm,
  validateRecruitmentApplicationForm,
} from './applicationFormValidation'

export type DemoDataValidationResult = {
  valid: boolean
  errors: string[]
}

const applications = applicationsData as Application[]
const applicationForms = applicationFormsData as ApplicationForm[]
const candidates = candidatesData as Candidate[]
const communications = communicationsData as Communication[]
const evaluations = evaluationsData as Evaluation[]
const interviews = interviewsData as Interview[]
const jobs = jobsData as Job[]
const rubrics = rubricsData as EvaluationRubric[]
const transcripts = transcriptsData as Transcript[]

function validateEvidenceReference(
  evaluationId: string,
  evidence: EvidenceReference,
  answerIds: ReadonlySet<string>,
  documentIds: ReadonlySet<string>,
  transcriptSegmentIds: ReadonlySet<string>,
  errors: string[],
) {
  if (
    evidence.sourceType === 'APPLICATION_ANSWER' &&
    !answerIds.has(evidence.sourceId)
  ) {
    errors.push(
      `Evaluation ${evaluationId} references unknown application answer ${evidence.sourceId}`,
    )
  }

  if (
    evidence.sourceType === 'DOCUMENT' &&
    !documentIds.has(evidence.sourceId)
  ) {
    errors.push(
      `Evaluation ${evaluationId} references unknown document ${evidence.sourceId}`,
    )
  }

  if (
    evidence.sourceType === 'TRANSCRIPT_SEGMENT' &&
    !transcriptSegmentIds.has(evidence.sourceId)
  ) {
    errors.push(
      `Evaluation ${evaluationId} references unknown transcript segment ${evidence.sourceId}`,
    )
  }

  if (evidence.sourceType === 'HUMAN_NOTE') {
    errors.push(
      `Evaluation ${evaluationId} references human note ${evidence.sourceId}, but no human-note data source exists`,
    )
  }
}

export function validateDemoData(): DemoDataValidationResult {
  const errors: string[] = []
  const jobIds = new Set(jobs.map((job) => job.id))
  const candidateIds = new Set(candidates.map((candidate) => candidate.id))
  const applicationIds = new Set(
    applications.map((application) => application.id),
  )
  const interviewIds = new Set(interviews.map((interview) => interview.id))
  const answerIds = new Set(
    applications.flatMap((application) =>
      application.answers.map((answer) => answer.id),
    ),
  )
  const documentIds = new Set(
    applications.flatMap((application) =>
      application.documents.map((document) => document.id),
    ),
  )
  const transcriptSegmentIds = new Set(
    transcripts.flatMap((transcript) =>
      transcript.segments.map((segment) => segment.id),
    ),
  )
  const formIds = applicationForms.map((form) => form.id)
  const fieldIds = applicationForms.flatMap((form) =>
    form.fields.map((field) => field.id),
  )

  if (new Set(formIds).size !== formIds.length) {
    errors.push('Application form IDs must be unique.')
  }

  if (new Set(fieldIds).size !== fieldIds.length) {
    errors.push('Application form field IDs must be globally unique.')
  }

  for (const job of jobs) {
    if (!['DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED'].includes(job.status)) errors.push(`Job ${job.id} has an invalid status.`)
    if (!job.updatedAt) errors.push(`Job ${job.id} is missing updatedAt.`)
    if (!['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY'].includes(job.employmentType)) errors.push(`Job ${job.id} has an invalid employment type.`)
    if (!['ONSITE', 'HYBRID', 'REMOTE'].includes(job.workArrangement)) errors.push(`Job ${job.id} has an invalid work arrangement.`)
  }

  for (const form of applicationForms) {
    if (!jobIds.has(form.jobId)) {
      errors.push(`Application form ${form.id} references unknown job ${form.jobId}`)
    }

    const validation = validateApplicationForm(form)
    for (const error of validation.errors) {
      errors.push(`Application form ${form.id}: ${error}`)
    }

    if (form.status === 'PUBLISHED') {
      const recruitmentValidation = validateRecruitmentApplicationForm(form)
      for (const error of recruitmentValidation.errors) {
        if (!validation.errors.includes(error)) {
          errors.push(`Published application form ${form.id}: ${error}`)
        }
      }

      if (!Number.isInteger(form.version) || form.version <= 0) {
        errors.push(
          `Published application form ${form.id} must have a positive integer version.`,
        )
      }
    }
  }

  for (const job of jobs) {
    const publishedCount = applicationForms.filter(
      (form) => form.jobId === job.id && form.status === 'PUBLISHED',
    ).length

    if (publishedCount > 1) {
      errors.push(`Job ${job.id} has more than one published application form.`)
    }
  }

  for (const application of applications) {
    if (!jobIds.has(application.jobId)) {
      errors.push(
        `Application ${application.id} references unknown job ${application.jobId}`,
      )
    }

    if (!candidateIds.has(application.candidateId)) {
      errors.push(
        `Application ${application.id} references unknown candidate ${application.candidateId}`,
      )
    }
  }

  for (const evaluation of evaluations) {
    const application = applications.find(
      (item) => item.id === evaluation.applicationId,
    )

    if (!applicationIds.has(evaluation.applicationId) || !application) {
      errors.push(
        `Evaluation ${evaluation.id} references unknown application ${evaluation.applicationId}`,
      )
    } else {
      const rubric = rubrics.find((item) => item.jobId === application.jobId)

      if (rubric) {
        const criterionKeys = new Set(
          rubric.criteria.map((criterion) => criterion.key),
        )

        for (const criterionScore of evaluation.criterionScores) {
          if (!criterionKeys.has(criterionScore.criterionKey)) {
            errors.push(
              `Evaluation ${evaluation.id} uses unknown rubric criterion ${criterionScore.criterionKey}`,
            )
          }
        }
      }
    }

    const evidenceReferences = [
      ...evaluation.strengths.flatMap((insight) => insight.evidence),
      ...evaluation.concerns.flatMap((insight) => insight.evidence),
      ...evaluation.criterionScores.flatMap((criterion) => criterion.evidence),
    ]

    for (const evidence of evidenceReferences) {
      validateEvidenceReference(
        evaluation.id,
        evidence,
        answerIds,
        documentIds,
        transcriptSegmentIds,
        errors,
      )
    }
  }

  for (const interview of interviews) {
    if (!applicationIds.has(interview.applicationId)) {
      errors.push(
        `Interview ${interview.id} references unknown application ${interview.applicationId}`,
      )
    }
  }

  for (const transcript of transcripts) {
    if (!interviewIds.has(transcript.interviewId)) {
      errors.push(
        `Transcript ${transcript.id} references unknown interview ${transcript.interviewId}`,
      )
    }
  }

  for (const communication of communications) {
    if (!applicationIds.has(communication.applicationId)) {
      errors.push(
        `Communication ${communication.id} references unknown application ${communication.applicationId}`,
      )
    }
  }

  for (const rubric of rubrics) {
    if (!jobIds.has(rubric.jobId)) {
      errors.push(`Rubric ${rubric.id} references unknown job ${rubric.jobId}`)
    }

    const totalWeight = rubric.criteria.reduce(
      (total, criterion) => total + criterion.weight,
      0,
    )

    if (totalWeight !== 100) {
      errors.push(
        `Rubric ${rubric.id} weights must total 100; received ${totalWeight}`,
      )
    }

    if (!['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(rubric.status)) {
      errors.push(`Rubric ${rubric.id} has an invalid status.`)
    }
    if (!Number.isInteger(rubric.version) || rubric.version <= 0) {
      errors.push(`Rubric ${rubric.id} must have a positive integer version.`)
    }
    if (!rubric.createdAt || !rubric.updatedAt) {
      errors.push(`Rubric ${rubric.id} must include persistence timestamps.`)
    }
  }

  for (const job of jobs) {
    if (rubrics.filter((rubric) => rubric.jobId === job.id && rubric.status === 'PUBLISHED').length > 1) {
      errors.push(`Job ${job.id} has more than one published screening rubric.`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

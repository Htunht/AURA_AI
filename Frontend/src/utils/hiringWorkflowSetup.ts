import type { DemoState } from '../store/demoStateTypes'
import type { ApplicationForm, ApplicationFormField } from '../types/applicationForm'
import type { HiringWorkflowReadiness, HiringWorkflowSetupProgress, HiringWorkflowSetupStep } from '../types/hiringWorkflowSetup'
import type { Job } from '../types/job'
import type { JobRequirement } from '../types/jobRequirement'
import type { EvaluationRubric } from '../types/rubric'
import { validateRecruitmentApplicationForm } from './applicationFormValidation'
import { createJobRequirementFingerprint, deriveJobRequirements, requirementSlug } from './jobRequirements'
import { validateJob } from './jobValidation'

const coreKeys = ['full_name', 'email', 'phone', 'current_position', 'years_of_experience', 'location', 'cv']
export type RequirementCoverageItem = { requirement: JobRequirement; fields: ApplicationFormField[]; covered: boolean }

export function getEffectiveRequirementIds(field: ApplicationFormField, requirements: JobRequirement[]): string[] {
  if (field.screeningMapping?.requirementIds.length) return field.screeningMapping.requirementIds
  const key = field.key.toLocaleLowerCase()
  if (key === 'years_experience' || key === 'years_of_experience' || field.label.toLocaleLowerCase().includes('years of experience')) return requirements.filter((item) => item.type === 'MINIMUM_EXPERIENCE').map((item) => item.id)
  if (key === 'skills' || field.label.toLocaleLowerCase() === 'skills') return requirements.filter((item) => item.type === 'REQUIRED_SKILL' || item.type === 'PREFERRED_SKILL').map((item) => item.id)
  const label = field.label.toLocaleLowerCase()
  return requirements.filter((item) => item.skillName && (key.includes(requirementSlug(item.skillName).replaceAll('-', '_')) || (label.includes(item.skillName.toLocaleLowerCase()) && /(experience|used|skills|work|project)/.test(label)))).map((item) => item.id)
}

export function evaluateRequirementCoverage(requirements: JobRequirement[], fields: ApplicationFormField[]): RequirementCoverageItem[] {
  return requirements.map((requirement) => {
    const mapped = fields.filter((field) => getEffectiveRequirementIds(field, requirements).includes(requirement.id))
    return { requirement, fields: mapped, covered: mapped.length > 0 }
  })
}

export function evaluateWorkflowArtifacts(job: Job, form: ApplicationForm | undefined, rubric: EvaluationRubric | undefined): HiringWorkflowReadiness {
  const requirementsReady = validateJob(job).valid
  const requirements = deriveJobRequirements(job)
  const coverage = form ? evaluateRequirementCoverage(requirements, form.fields) : []
  const missingRequired = coverage.filter((item) => item.requirement.importance === 'REQUIRED' && !item.covered)
  const missingPreferred = coverage.filter((item) => item.requirement.importance === 'PREFERRED' && !item.covered)
  const presentKeys = new Set(form?.fields.map((field) => field.key === 'years_experience' ? 'years_of_experience' : field.key) ?? [])
  const coreMissing = coreKeys.filter((key) => !presentKeys.has(key))
  const formValid = Boolean(form && validateRecruitmentApplicationForm(form).valid && coreMissing.length === 0 && missingRequired.length === 0)
  const weights = rubric?.criteria.reduce((sum, criterion) => sum + criterion.weight, 0) ?? 0
  const rubricKeys = new Set(rubric?.criteria.map((criterion) => criterion.key) ?? [])
  const mappedCriterionKeys = new Set(form?.fields.flatMap((field) => field.screeningMapping?.criterionKeys ?? []) ?? [])
  const invalidCriterionMappings = form?.fields.flatMap((field) => field.screeningMapping?.criterionKeys.filter((key) => !rubricKeys.has(key)).map((key) => `${field.label} maps to unavailable category “${key}”.`) ?? []) ?? []
  const criteriaWithoutEvidence = rubric?.requirementRules ? rubric.criteria.filter((criterion) => !mappedCriterionKeys.has(criterion.key)) : []
  const screeningReady = Boolean(rubric && rubric.criteria.length > 0 && weights === 100 && missingRequired.length === 0 && invalidCriterionMappings.length === 0 && criteriaWithoutEvidence.length === 0)
  const blockingIssues = [
    ...(!requirementsReady ? ['Complete the job requirements.'] : []),
    ...(!form ? ['Create the application form.'] : []),
    ...coreMissing.map((key) => `Core application question “${key.replaceAll('_', ' ')}” is missing.`),
    ...missingRequired.map((item) => `Required qualification “${item.requirement.label}” has no evidence question.`),
    ...(rubric && weights !== 100 ? [`Screening weights total ${weights}% instead of 100%.`] : []),
    ...invalidCriterionMappings,
    ...criteriaWithoutEvidence.map((criterion) => `Evaluation category “${criterion.name}” has no evidence question.`),
    ...(!rubric ? ['Review the generated screening rules.'] : []),
  ]
  const warnings = missingPreferred.map((item) => `Preferred qualification “${item.requirement.label}” has no direct evidence question.`)
  const previewReady = formValid
  return { ready: requirementsReady && formValid && screeningReady && previewReady, requirementsReady, formReady: formValid, screeningReady, previewReady, blockingIssues, warnings }
}

export function evaluateHiringWorkflowReadiness(state: DemoState, jobId: string): HiringWorkflowReadiness {
  const job = state.jobs.find((item) => item.id === jobId)
  if (!job) return { ready: false, requirementsReady: false, formReady: false, screeningReady: false, previewReady: false, blockingIssues: ['Job could not be found.'], warnings: [] }
  const form = state.applicationForms.filter((item) => item.jobId === jobId).sort((a, b) => b.version - a.version).find((item) => item.status === 'DRAFT') ?? state.applicationForms.filter((item) => item.jobId === jobId).sort((a, b) => b.version - a.version).find((item) => item.status === 'PUBLISHED')
  const rubric = state.rubrics.filter((item) => item.jobId === jobId).sort((a, b) => b.version - a.version).find((item) => item.status === 'DRAFT') ?? state.rubrics.filter((item) => item.jobId === jobId).sort((a, b) => b.version - a.version).find((item) => item.status === 'PUBLISHED')
  const result = evaluateWorkflowArtifacts(job, form, rubric)
  const currentFingerprint = createJobRequirementFingerprint(job)
  const publishedForm = state.applicationForms.find((item) => item.jobId === jobId && item.status === 'PUBLISHED')
  const changed = Boolean(publishedForm?.requirementFingerprint && publishedForm.requirementFingerprint !== currentFingerprint)
  return { ...result, warnings: [...result.warnings, ...(changed ? ['Job requirements changed. Review the application form and screening rules before publishing the next version.'] : [])] }
}

export function selectHiringWorkflowSetupProgress(state: DemoState, jobId: string): HiringWorkflowSetupProgress {
  const readiness = evaluateHiringWorkflowReadiness(state, jobId)
  const published = state.applicationForms.some((item) => item.jobId === jobId && item.status === 'PUBLISHED') && state.rubrics.some((item) => item.jobId === jobId && item.status === 'PUBLISHED')
  const hasDraft = state.applicationForms.some((item) => item.jobId === jobId && item.status === 'DRAFT') || state.rubrics.some((item) => item.jobId === jobId && item.status === 'DRAFT')
  const completedSteps: HiringWorkflowSetupStep[] = []
  if (readiness.requirementsReady) completedSteps.push('REQUIREMENTS')
  if (readiness.formReady) completedSteps.push('APPLICATION_FORM')
  if (readiness.screeningReady) completedSteps.push('SCREENING_RULES')
  if (readiness.ready && published) completedSteps.push('REVIEW')
  const currentStep: HiringWorkflowSetupStep = !readiness.requirementsReady ? 'REQUIREMENTS' : !readiness.formReady ? 'APPLICATION_FORM' : !readiness.screeningReady ? 'SCREENING_RULES' : 'REVIEW'
  const status = published && readiness.ready && !hasDraft ? 'PUBLISHED' : readiness.ready ? 'READY' : completedSteps.length ? 'IN_PROGRESS' : 'NOT_STARTED'
  return { currentStep, completedSteps, status, issues: readiness.blockingIssues }
}

export function getHiringWorkflowPrimaryAction(progress: HiringWorkflowSetupProgress) {
  if (progress.status === 'PUBLISHED') return { label: 'View candidates', step: 'review' }
  const step = progress.currentStep === 'REQUIREMENTS' ? 'requirements' : progress.currentStep === 'APPLICATION_FORM' ? 'form' : progress.currentStep === 'SCREENING_RULES' ? 'screening' : 'review'
  return { label: progress.currentStep === 'REQUIREMENTS' ? 'Continue setup' : progress.currentStep === 'APPLICATION_FORM' ? 'Continue application form' : progress.currentStep === 'SCREENING_RULES' ? 'Review screening rules' : 'Review and publish', step }
}

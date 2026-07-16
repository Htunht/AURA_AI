import { createRecommendedApplicationForm, generateRequirementAwareQuestions } from '../services/applicationQuestionGeneration'
import { createFormAwareScreeningEvaluation } from '../services/ai'
import { collectRequirementEvidence } from '../services/screeningEvidence'
import { generateScreeningRules } from '../services/screeningRuleGeneration'
import { demoReducer, initialDemoState, type DemoState } from '../store/demoReducer'
import type { Application } from '../types/application'
import type { Job } from '../types/job'
import { evaluateHiringWorkflowReadiness, evaluateRequirementCoverage, getEffectiveRequirementIds, getHiringWorkflowPrimaryAction, selectHiringWorkflowSetupProgress } from './hiringWorkflowSetup'
import { createJobRequirementFingerprint, deriveJobRequirements } from './jobRequirements'

export type HiringWorkflowSetupValidationResult = { valid: boolean; errors: string[] }
const check = (errors: string[], condition: boolean, message: string) => { if (!condition) errors.push(message) }

export function validateHiringWorkflowSetupDomain(): HiringWorkflowSetupValidationResult {
  const errors: string[] = []
  const snapshot = JSON.stringify(initialDemoState)
  const sourceJob = initialDemoState.jobs[0]
  const candidate = initialDemoState.candidates[0]
  const sourceApplication = initialDemoState.applications[0]
  if (!sourceJob || !candidate || !sourceApplication) return { valid: false, errors: ['Guided workflow validation fixtures are unavailable.'] }
  const job: Job = { ...sourceJob, requiredSkills: [{ name: 'React', priority: 'REQUIRED' }, { name: 'Automated Testing', priority: 'PREFERRED' }], minimumExperienceYears: 3 }
  const requirements = deriveJobRequirements(job)
  const minimum = requirements.find((item) => item.type === 'MINIMUM_EXPERIENCE')
  const requiredSkill = requirements.find((item) => item.type === 'REQUIRED_SKILL')
  const preferredSkill = requirements.find((item) => item.type === 'PREFERRED_SKILL')
  check(errors, Boolean(minimum && requiredSkill && preferredSkill), 'Requirements were not derived from minimum, required, and preferred job fields')
  check(errors, deriveJobRequirements(job).map((item) => item.id).join('|') === requirements.map((item) => item.id).join('|'), 'Requirement IDs are not deterministic')
  const timestamp = '2026-07-16T10:00:00.000Z'
  const form = createRecommendedApplicationForm(job, requirements, 2, timestamp)
  const keys = form.fields.map((field) => field.key)
  check(errors, ['full_name', 'email', 'phone', 'current_position', 'years_of_experience', 'location', 'cv'].every((key) => keys.includes(key)), 'Recommended form is missing core fields')
  check(errors, new Set(keys).size === keys.length, 'Recommended core field keys are not unique')
  const requiredQuestion = form.fields.find((field) => field.screeningMapping?.requirementIds.includes(requiredSkill?.id ?? ''))
  const preferredQuestion = form.fields.find((field) => field.screeningMapping?.requirementIds.includes(preferredSkill?.id ?? ''))
  check(errors, Boolean(requiredQuestion), 'Required skill did not generate an evidence question')
  check(errors, Boolean(preferredQuestion && !preferredQuestion.required), 'Preferred skill did not generate an optional question')
  const suggestions = generateRequirementAwareQuestions({ job, requirements, existingFields: form.fields })
  check(errors, !suggestions.some((item) => item.requirementIds.includes(requiredSkill?.id ?? '')), 'Covered required requirement was suggested again')
  check(errors, form.fields.flatMap((field) => field.screeningMapping?.requirementIds ?? []).every((id) => requirements.some((item) => item.id === id)), 'Question mapping references an invalid requirement')

  const missingRequiredForm = { ...form, fields: form.fields.filter((field) => field.id !== requiredQuestion?.id) }
  const requiredCoverage = evaluateRequirementCoverage(requirements, missingRequiredForm.fields)
  check(errors, requiredCoverage.some((item) => item.requirement.id === requiredSkill?.id && !item.covered), 'Missing required evidence was not detected')
  const missingPreferredForm = { ...form, fields: form.fields.filter((field) => field.id !== preferredQuestion?.id) }
  const ruleSet = generateScreeningRules({ job, requirements, form })
  check(errors, ruleSet.rubric.criteria.reduce((sum, item) => sum + item.weight, 0) === 100, 'Generated screening weights do not total 100')
  check(errors, ruleSet.requirementRules.filter((rule) => rule.importance === 'REQUIRED').every((rule) => rule.fieldKeys.length > 0), 'Required rule has no evidence source')
  check(errors, ruleSet.requirementRules.find((rule) => rule.requirementId === minimum?.id)?.scoringBehavior === 'THRESHOLD', 'Minimum experience does not use threshold behavior')
  check(errors, ruleSet.requirementRules.find((rule) => rule.requirementId === requiredSkill?.id)?.scoringBehavior === 'EVIDENCE_STRENGTH', 'Required skill does not use evidence-strength behavior')
  check(errors, ruleSet.requirementRules.find((rule) => rule.requirementId === preferredSkill?.id)?.importance === 'PREFERRED', 'Preferred skill rule lost preferred behavior')
  const completeState: DemoState = { ...initialDemoState, jobs: initialDemoState.jobs.map((item) => item.id === job.id ? job : item), applicationForms: [...initialDemoState.applicationForms.filter((item) => !(item.jobId === job.id && item.status === 'DRAFT')), form], rubrics: [...initialDemoState.rubrics, ruleSet.rubric] }
  check(errors, evaluateHiringWorkflowReadiness(completeState, job.id).ready, 'Complete guided workflow was not ready')
  const missingRequiredState = { ...completeState, applicationForms: completeState.applicationForms.map((item) => item.id === form.id ? missingRequiredForm : item) }
  check(errors, !evaluateHiringWorkflowReadiness(missingRequiredState, job.id).ready, 'Readiness accepted missing required coverage')
  const missingPreferredState = { ...completeState, applicationForms: completeState.applicationForms.map((item) => item.id === form.id ? missingPreferredForm : item), rubrics: completeState.rubrics.map((item) => item.id === ruleSet.rubric.id ? generateScreeningRules({ job, requirements, form: missingPreferredForm }).rubric : item) }
  const optionalReadiness = evaluateHiringWorkflowReadiness(missingPreferredState, job.id)
  check(errors, optionalReadiness.ready && optionalReadiness.warnings.length > 0, 'Preferred missing evidence did not remain a non-blocking warning')
  check(errors, selectHiringWorkflowSetupProgress(completeState, job.id).currentStep === 'REVIEW', 'Setup progress did not resolve the review step')
  check(errors, getHiringWorkflowPrimaryAction(selectHiringWorkflowSetupProgress(completeState, job.id)).label === 'Review and publish', 'Context-aware job action is incorrect')

  const published = demoReducer(completeState, { type: 'PUBLISH_HIRING_WORKFLOW', payload: { jobId: job.id, formId: form.id, rubricId: ruleSet.rubric.id, publishedAt: timestamp } })
  check(errors, published.applicationForms.find((item) => item.id === form.id)?.status === 'PUBLISHED' && published.rubrics.find((item) => item.id === ruleSet.rubric.id)?.status === 'PUBLISHED', 'Atomic publish did not publish form and rules together')
  check(errors, published.applicationForms.filter((item) => item.jobId === job.id && item.id !== form.id).every((item) => item.status !== 'PUBLISHED') && published.rubrics.filter((item) => item.jobId === job.id && item.id !== ruleSet.rubric.id).every((item) => item.status !== 'PUBLISHED'), 'Atomic publish did not archive prior versions')
  const invalidRubric = { ...ruleSet.rubric, criteria: ruleSet.rubric.criteria.map((item, index) => index === 0 ? { ...item, weight: item.weight + 1 } : item) }
  const invalidState = { ...completeState, rubrics: completeState.rubrics.map((item) => item.id === invalidRubric.id ? invalidRubric : item) }
  check(errors, demoReducer(invalidState, { type: 'PUBLISH_HIRING_WORKFLOW', payload: { jobId: job.id, formId: form.id, rubricId: invalidRubric.id, publishedAt: timestamp } }) === invalidState, 'Failed publish partially changed state')

  const legacyField = { ...form.fields.find((field) => field.key === 'years_of_experience')!, key: 'years_experience', screeningMapping: undefined }
  check(errors, getEffectiveRequirementIds(legacyField, requirements).includes(minimum?.id ?? ''), 'Legacy experience field did not receive an effective mapping')
  check(errors, !generateRequirementAwareQuestions({ job, requirements, existingFields: [legacyField] }).some((item) => item.field.key === 'years_of_experience'), 'Legacy migration duplicated the experience field')
  const changedState = { ...published, jobs: published.jobs.map((item) => item.id === job.id ? { ...item, minimumExperienceYears: item.minimumExperienceYears + 1 } : item) }
  check(errors, evaluateHiringWorkflowReadiness(changedState, job.id).warnings.some((item) => item.includes('requirements changed')), 'Requirements change did not create a review warning')

  const answer = (fieldKey: string, value: string | number) => ({ id: `answer-${fieldKey}`, fieldKey, label: form.fields.find((field) => field.key === fieldKey)?.label ?? fieldKey, value })
  const application: Application = { ...sourceApplication, id: 'application-guided-rich', jobId: job.id, candidateId: candidate.id, answers: [answer('years_of_experience', 4), answer(requiredQuestion?.key ?? '', `I used React in production for four years, owning architecture, testing, delivery, and measurable performance improvements.`)], documents: sourceApplication.documents.map((item) => ({ ...item })) }
  const weakApplication: Application = { ...application, id: 'application-guided-weak', answers: [answer('years_of_experience', 1)] }
  const richEvidence = collectRequirementEvidence({ requirements, form, application, candidateSkills: candidate.skills })
  const weakEvidence = collectRequirementEvidence({ requirements, form, application: weakApplication, candidateSkills: [] })
  check(errors, richEvidence.find((item) => item.requirementId === minimum?.id)?.evidenceStatus !== weakEvidence.find((item) => item.requirementId === minimum?.id)?.evidenceStatus, 'Minimum-experience evidence did not change with the answer')
  check(errors, richEvidence.find((item) => item.requirementId === requiredSkill?.id)?.evidenceStatus !== weakEvidence.find((item) => item.requirementId === requiredSkill?.id)?.evidenceStatus, 'Required-skill evidence did not change with the mapped answer')
  const richEvaluation = createFormAwareScreeningEvaluation({ application, rubric: ruleSet.rubric, form, job, candidate, createdAt: timestamp })
  const weakEvaluation = createFormAwareScreeningEvaluation({ application: weakApplication, rubric: ruleSet.rubric, form, job, candidate: { ...candidate, skills: [] }, createdAt: timestamp })
  check(errors, richEvaluation.overallScore !== weakEvaluation.overallScore, 'New screening result depends on candidate ID instead of submitted answers')
  check(errors, weakEvaluation.recommendation === 'REVIEW' || weakEvaluation.recommendation === 'NO' || weakEvaluation.recommendation === 'STRONG_NO', 'Missing required evidence did not trigger review or a lower recommendation')
  check(errors, createJobRequirementFingerprint(job) === createJobRequirementFingerprint({ ...job, requiredSkills: [...job.requiredSkills].reverse() }), 'Requirement fingerprint depends on skill order')
  check(errors, JSON.stringify(initialDemoState) === snapshot, 'Guided workflow validation mutated initial state')
  try { JSON.stringify(published) } catch { errors.push('Guided workflow state is not JSON serializable') }
  return { valid: errors.length === 0, errors }
}

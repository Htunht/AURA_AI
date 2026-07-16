import type { ApplicationForm } from '../types/applicationForm'
import type { Job } from '../types/job'
import type { JobRequirement } from '../types/jobRequirement'
import type { EvaluationRubric } from '../types/rubric'
import type { RequirementScreeningRule } from '../types/hiringWorkflowSetup'
import { createJobRequirementFingerprint } from '../utils/jobRequirements'
import { getEffectiveRequirementIds } from '../utils/hiringWorkflowSetup'

export type GeneratedScreeningRuleSet = { rubric: EvaluationRubric; requirementRules: RequirementScreeningRule[]; warnings: string[] }

export function generateScreeningRules({ job, requirements, form, previousRubric }: { job: Job; requirements: JobRequirement[]; form: ApplicationForm; previousRubric?: EvaluationRubric }): GeneratedScreeningRuleSet {
  const version = previousRubric ? previousRubric.version + 1 : 1
  const requirementRules = requirements.map((requirement) => ({ id: `rule-${requirement.id}`, requirementId: requirement.id, fieldKeys: form.fields.filter((field) => getEffectiveRequirementIds(field, requirements).includes(requirement.id)).map((field) => field.key), importance: requirement.importance, scoringBehavior: requirement.type === 'MINIMUM_EXPERIENCE' ? 'THRESHOLD' as const : requirement.importance === 'SUPPORTING' ? 'SUPPORTING_ONLY' as const : 'EVIDENCE_STRENGTH' as const }))
  const warnings = requirementRules.filter((rule) => rule.fieldKeys.length === 0).map((rule) => `${requirements.find((item) => item.id === rule.requirementId)?.label ?? 'Requirement'} has no direct evidence question.`)
  const timestamp = form.updatedAt
  const criteria = [
    { key: 'required_qualifications', name: 'Required qualifications match', description: `Evidence for ${requirements.filter((item) => item.importance === 'REQUIRED').map((item) => item.label).join(', ')}.`, evaluationGuidance: 'Missing required evidence lowers this score and creates a recruiter-review flag.', weight: 40 },
    { key: 'relevant_experience', name: 'Relevant experience', description: `Experience aligned with ${job.title} responsibilities.`, evaluationGuidance: 'Compare submitted years and examples with the role scope.', weight: 25 },
    { key: 'role_evidence', name: 'Role-specific evidence', description: 'Strength and specificity of mapped required and preferred qualification evidence.', evaluationGuidance: 'Reward concrete contribution and outcomes; preferred evidence is additive.', weight: 20 },
    { key: 'problem_solving', name: 'Problem solving', description: 'Evidence of structured problem solving and judgment.', evaluationGuidance: 'Review the mapped problem-solving response.', weight: 10 },
    { key: 'communication', name: 'Communication clarity', description: 'Clarity and completeness of submitted evidence.', evaluationGuidance: 'Use mapped supporting answers without treating style as a qualification.', weight: 5 },
  ]
  const rubric: EvaluationRubric = { id: `rubric-${job.id}-v${version}`, jobId: job.id, name: `${job.title} screening rules`, status: 'DRAFT', version, criteria, requirementRules, requirementFingerprint: createJobRequirementFingerprint(job), createdAt: timestamp, updatedAt: timestamp }
  return { rubric, requirementRules, warnings }
}

import type { ApplicationForm, ApplicationFormField } from '../types/applicationForm'
import type { Job } from '../types/job'
import type { JobRequirement } from '../types/jobRequirement'
import { createJobRequirementFingerprint, requirementSlug } from '../utils/jobRequirements'
import { getEffectiveRequirementIds } from '../utils/hiringWorkflowSetup'

export type RequirementAwareQuestionSuggestion = { id: string; field: ApplicationFormField; requirementIds: string[]; criterionKeys: string[]; reason: string; evidenceImportance: 'REQUIRED' | 'PREFERRED' | 'SUPPORTING' }

function field(job: Job, key: string, label: string, type: ApplicationFormField['type'], required: boolean, helpText?: string): ApplicationFormField {
  return { id: `field-${job.id}-${key}`, key, label, type, required, ...(helpText ? { helpText } : {}) }
}

function suggestion(job: Job, candidate: ApplicationFormField, requirementIds: string[] = [], criterionKeys: string[] = [], importance: RequirementAwareQuestionSuggestion['evidenceImportance'] = 'SUPPORTING', reason = 'Collects candidate information for recruiter review.'): RequirementAwareQuestionSuggestion {
  const mappedField = requirementIds.length || criterionKeys.length ? { ...candidate, screeningMapping: { requirementIds, criterionKeys, evidenceImportance: importance } } : candidate
  return { id: `suggestion-${job.id}-${candidate.key}`, field: mappedField, requirementIds, criterionKeys, reason, evidenceImportance: importance }
}

export function generateRequirementAwareQuestions({ job, requirements, existingFields }: { job: Job; requirements: JobRequirement[]; existingFields: ApplicationFormField[] }): RequirementAwareQuestionSuggestion[] {
  const existingKeys = new Set(existingFields.map((item) => item.key.toLocaleLowerCase()))
  if (existingKeys.has('years_experience')) existingKeys.add('years_of_experience')
  const covered = new Set(existingFields.flatMap((item) => getEffectiveRequirementIds(item, requirements)))
  const minimum = requirements.find((item) => item.type === 'MINIMUM_EXPERIENCE')
  const core = [
    suggestion(job, field(job, 'full_name', 'Full name', 'TEXT', true)), suggestion(job, field(job, 'email', 'Email', 'EMAIL', true)),
    suggestion(job, field(job, 'phone', 'Phone', 'PHONE', false)), suggestion(job, field(job, 'current_position', 'Current position', 'TEXT', false)),
    suggestion(job, field(job, 'years_of_experience', 'How many years of professional experience do you have?', 'NUMBER', true), minimum ? [minimum.id] : [], ['relevant_experience'], 'REQUIRED', 'Checks the minimum experience requirement.'),
    suggestion(job, field(job, 'location', 'Location', 'TEXT', false)), suggestion(job, field(job, 'cv', 'CV / résumé', 'FILE', true)),
  ]
  const requirementQuestions = requirements.filter((item) => (item.type === 'REQUIRED_SKILL' || item.type === 'PREFERRED_SKILL') && !covered.has(item.id)).map((item) => suggestion(job, field(job, `${item.type === 'REQUIRED_SKILL' ? 'required' : 'preferred'}_${requirementSlug(item.skillName ?? item.label)}_evidence`, `Describe how you have used ${item.skillName ?? item.label} in relevant work.`, 'TEXTAREA', item.importance === 'REQUIRED', 'Focus on your contribution, context, and outcome.'), [item.id], item.importance === 'REQUIRED' ? ['required_qualifications', 'role_evidence'] : ['role_evidence'], item.importance, `${item.importance === 'REQUIRED' ? 'Required' : 'Preferred'} qualification evidence for ${item.label}.`))
  const supporting = [
    suggestion(job, field(job, 'problem_solving', 'Describe a difficult problem you solved and the approach you took.', 'TEXTAREA', false), [], ['problem_solving'], 'SUPPORTING', 'Provides evidence of structured problem solving.'),
    suggestion(job, field(job, 'motivation', `Why are you interested in the ${job.title} role?`, 'TEXTAREA', false), [], ['communication'], 'SUPPORTING', 'Supports motivation and communication review.'),
  ]
  return [...core, ...requirementQuestions, ...supporting].filter((item) => !existingKeys.has(item.field.key.toLocaleLowerCase())).slice(0, Math.max(0, 14 - existingFields.length))
}

export function createRecommendedApplicationForm(job: Job, requirements: JobRequirement[], version: number, timestamp: string): ApplicationForm {
  const suggestions = generateRequirementAwareQuestions({ job, requirements, existingFields: [] })
  return { id: `form-${job.id}-v${version}`, jobId: job.id, name: `${job.title} application`, description: 'Share your experience and evidence for this role.', status: 'DRAFT', version, fields: suggestions.map((item) => ({ ...item.field })), requirementFingerprint: createJobRequirementFingerprint(job), createdAt: timestamp, updatedAt: timestamp }
}

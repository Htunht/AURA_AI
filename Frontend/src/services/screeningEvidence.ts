import type { Application, ApplicationAnswer } from '../types/application'
import type { ApplicationForm } from '../types/applicationForm'
import type { JobRequirement } from '../types/jobRequirement'
import { getEffectiveRequirementIds } from '../utils/hiringWorkflowSetup'

export type RequirementEvidence = { requirementId: string; fieldKeys: string[]; answers: ApplicationAnswer[]; evidenceStatus: 'STRONG' | 'MODERATE' | 'WEAK' | 'MISSING' }
export type MinimumExperienceResult = 'MET' | 'PARTIALLY_MET' | 'NOT_MET' | 'MISSING_EVIDENCE'

function answerText(answer: ApplicationAnswer) { return Array.isArray(answer.value) ? answer.value.join(' ') : String(answer.value) }
function normalized(value: string) { return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ') }

export function evaluateMinimumExperience(requirement: JobRequirement, answers: ApplicationAnswer[]): MinimumExperienceResult {
  const value = Number(answers[0]?.value)
  const minimum = requirement.minimumValue ?? 0
  if (!Number.isFinite(value)) return 'MISSING_EVIDENCE'
  if (value >= minimum) return 'MET'
  if (value >= Math.max(0, minimum - 1)) return 'PARTIALLY_MET'
  return 'NOT_MET'
}

export function collectRequirementEvidence({ requirements, form, application, candidateSkills = [] }: { requirements: JobRequirement[]; form: ApplicationForm; application: Application; candidateSkills?: string[] }): RequirementEvidence[] {
  return requirements.map((requirement) => {
    const fieldKeys = form.fields.filter((field) => getEffectiveRequirementIds(field, requirements).includes(requirement.id)).map((field) => field.key)
    const answers = application.answers.filter((answer) => fieldKeys.includes(answer.fieldKey) && answerText(answer).trim())
    let evidenceStatus: RequirementEvidence['evidenceStatus'] = 'MISSING'
    if (requirement.type === 'MINIMUM_EXPERIENCE') {
      const result = evaluateMinimumExperience(requirement, answers)
      evidenceStatus = result === 'MET' ? 'STRONG' : result === 'PARTIALLY_MET' ? 'MODERATE' : result === 'NOT_MET' ? 'WEAK' : 'MISSING'
    } else if (answers.length || requirement.skillName && candidateSkills.some((skill) => normalized(skill) === normalized(requirement.skillName ?? ''))) {
      const text = answers.map(answerText).join(' ')
      const namesSkill = requirement.skillName ? normalized(text).includes(normalized(requirement.skillName)) : false
      evidenceStatus = namesSkill && text.length >= 80 ? 'STRONG' : namesSkill || text.length >= 80 ? 'MODERATE' : text.length > 0 ? 'WEAK' : 'STRONG'
    }
    return { requirementId: requirement.id, fieldKeys, answers, evidenceStatus }
  })
}

import type { Job } from '../types/job'
import type { EvaluationRubric, RubricCriterion } from '../types/rubric'

export type RubricValidationResult = {
  valid: boolean
  errors: Record<string, string>
}

function nextRubricVersion(rubrics: EvaluationRubric[]) {
  return Math.max(0, ...rubrics.map((rubric) => rubric.version)) + 1
}

export function generateRubricDraft(
  job: Job,
  rubrics: EvaluationRubric[],
  timestamp: string,
): EvaluationRubric {
  const jobRubrics = rubrics.filter((rubric) => rubric.jobId === job.id)
  const published = jobRubrics.find((rubric) => rubric.status === 'PUBLISHED')
  const version = nextRubricVersion(jobRubrics)
  const skillNames = job.requiredSkills.map((skill) => skill.name)
  const roleEvidence = skillNames.length > 0
    ? skillNames.join(', ')
    : `the responsibilities described for ${job.title}`

  const defaultCriteria: RubricCriterion[] = [
    {
      key: 'role_skills',
      name: 'Role-specific skills',
      description: `Evidence of capability in ${roleEvidence}.`,
      evaluationGuidance: 'Prioritize concrete examples, delivered work, and demonstrated depth over keyword matches.',
      weight: 35,
    },
    {
      key: 'relevant_experience',
      name: 'Relevant experience',
      description: `Experience that maps directly to the scope and seniority of the ${job.title} role.`,
      evaluationGuidance: 'Consider relevance, ownership, outcomes, and transferable experience together.',
      weight: 25,
    },
    {
      key: 'problem_solving',
      name: 'Problem solving',
      description: 'Evidence of structured thinking, judgment, and learning through difficult work.',
      evaluationGuidance: 'Look for clear problem framing, trade-offs, actions, and measurable outcomes.',
      weight: 15,
    },
    {
      key: 'communication',
      name: 'Communication',
      description: 'Clarity, relevance, and completeness across the submitted application evidence.',
      evaluationGuidance: 'Score the candidate on understandable, specific, and role-relevant communication.',
      weight: 15,
    },
    {
      key: 'role_motivation',
      name: 'Role motivation',
      description: `Evidence of thoughtful interest in ${job.title} and the work of ${job.department}.`,
      evaluationGuidance: 'Look for specific motivation and realistic alignment, not enthusiasm alone.',
      weight: 10,
    },
  ]

  return {
    id: `rubric-${job.id}-v${version}`,
    jobId: job.id,
    name: published?.name ?? `${job.title} screening rubric`,
    status: 'DRAFT',
    version,
    criteria: (published?.criteria ?? defaultCriteria).map((criterion) => ({ ...criterion })),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createRubricCriterion(existing: RubricCriterion[]): RubricCriterion {
  let number = existing.length + 1
  while (existing.some((criterion) => criterion.key === `criterion_${number}`)) number += 1
  return {
    key: `criterion_${number}`,
    name: '',
    description: '',
    evaluationGuidance: '',
    weight: 0,
  }
}

export function validateRubricDraft(rubric: EvaluationRubric): RubricValidationResult {
  const errors: Record<string, string> = {}
  if (!rubric.name.trim()) errors.name = 'Enter a rubric name.'
  if (rubric.criteria.length === 0) errors.criteria = 'Add at least one evaluation criterion.'

  const keys = new Set<string>()
  rubric.criteria.forEach((criterion, index) => {
    const prefix = `criteria.${index}`
    if (!criterion.key.trim()) errors[`${prefix}.key`] = 'Enter a stable criterion key.'
    else if (!/^[a-z][a-z0-9_]*$/.test(criterion.key)) errors[`${prefix}.key`] = 'Use lowercase letters, numbers, and underscores.'
    else if (keys.has(criterion.key)) errors[`${prefix}.key`] = 'Criterion keys must be unique.'
    keys.add(criterion.key)
    if (!criterion.name.trim()) errors[`${prefix}.name`] = 'Enter a criterion name.'
    if (!criterion.description.trim()) errors[`${prefix}.description`] = 'Describe the evidence AURA should evaluate.'
    if (!criterion.evaluationGuidance.trim()) errors[`${prefix}.evaluationGuidance`] = 'Add evaluation guidance.'
    if (!Number.isFinite(criterion.weight) || criterion.weight <= 0) errors[`${prefix}.weight`] = 'Weight must be greater than zero.'
  })

  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  if (total !== 100) errors.totalWeight = `Weights must total exactly 100%. Current total: ${total}%.`
  return { valid: Object.keys(errors).length === 0, errors }
}

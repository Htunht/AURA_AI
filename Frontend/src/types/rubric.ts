export type RubricCriterion = {
  key: string
  name: string
  description: string
  evaluationGuidance: string
  weight: number
}

export type EvaluationRubricStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type EvaluationRubric = {
  id: string
  jobId: string
  name: string
  status: EvaluationRubricStatus
  version: number
  criteria: RubricCriterion[]
  createdAt: string
  updatedAt: string
  requirementFingerprint?: string
  requirementRules?: import('./hiringWorkflowSetup').RequirementScreeningRule[]
}

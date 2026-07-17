export type EvidenceRating = 1 | 2 | 3 | 4 | 5
export type EvidenceAssessmentState = 'DEMONSTRATED' | 'PARTIALLY_DEMONSTRATED' | 'NOT_DEMONSTRATED' | 'NOT_ASSESSED'

export type RatingAnchor = {
  rating: EvidenceRating
  label: string
  description: string
  observableIndicators: string[]
}

export type CompetencyScoringRule = {
  competencyKey: string
  label: string
  description: string
  weight: number
  requirementIds: string[]
  requirementLabels?: Record<string, string>
  criterionKeys: string[]
  questionIds: string[]
  importance: 'MUST_HAVE' | 'IMPORTANT' | 'PREFERRED'
  minimumPassingRating?: EvidenceRating
  anchors: RatingAnchor[]
}

export type PublishedInterviewScoringRubric = {
  id: string
  jobId: string
  version: number
  status: 'PUBLISHED'
  competencies: CompetencyScoringRule[]
  publishedAt: string
  createdAt: string
  updatedAt: string
}

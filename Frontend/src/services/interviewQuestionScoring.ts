import type { FinalEvaluationGenerationInput } from '../types/finalEvaluationGeneration'
import type { AssessmentReviewReason, InterviewQuestionAssessment } from '../types/interviewQuestionAssessment'
import type { EvidenceAssessmentState, EvidenceRating } from '../types/interviewScoringRubric'
import { createQuestionAssessmentId } from '../utils/finalEvaluationIds'
import { detectInterviewEvidenceSignals } from '../utils/interviewEvidenceSignals'

export type QuestionScoringResult = { assessments: InterviewQuestionAssessment[]; warnings: string[] }

function assessmentState(rating?: EvidenceRating): EvidenceAssessmentState {
  if (rating === undefined) return 'NOT_ASSESSED'
  if (rating === 1) return 'NOT_DEMONSTRATED'
  if (rating === 2) return 'PARTIALLY_DEMONSTRATED'
  return 'DEMONSTRATED'
}

export function scoreInterviewQuestions(input: FinalEvaluationGenerationInput): QuestionScoringResult {
  const warnings: string[] = []
  const assessments = input.questions.filter((question) => question.status === 'APPROVED').map((question) => {
    const progress = input.sessionQuestionProgress.find((item) => item.questionId === question.id)
    const segments = input.answerSegments.filter((item) => item.questionId === question.id)
    const evidence = input.approvedEvidence.filter((item) => item.questionIds.includes(question.id) || item.transcriptSegmentIds.some((id) => segments.some((segment) => segment.id === id)))
    const competencyKeys = input.rubric.competencies.filter((item) => item.questionIds.includes(question.id) || item.criterionKeys.some((key) => question.criterionKeys.includes(key)) || item.requirementIds.some((id) => question.requirementIds.includes(id))).map((item) => item.competencyKey)
    const reviewReasons: AssessmentReviewReason[] = []
    let rating: EvidenceRating | undefined
    let rationale = ''
    if (!progress || progress.status === 'SKIPPED' || progress.status === 'NOT_REACHED' || progress.status === 'NOT_ASKED') {
      reviewReasons.push('QUESTION_NOT_REACHED')
      rationale = 'The question was skipped or not reached, so no numeric rating was assigned.'
    } else if (!segments.length) {
      reviewReasons.push('INSUFFICIENT_EVIDENCE', 'TRANSCRIPT_MAPPING_UNCERTAIN')
      rationale = 'No candidate answer was mapped to this assessed question.'
    } else if (!competencyKeys.length) {
      reviewReasons.push('RUBRIC_MAPPING_MISSING')
      rationale = 'The answer is present, but the question is not mapped to a published competency.'
    } else {
      const text = segments.map((item) => item.text).join(' ')
      const signals = detectInterviewEvidenceSignals(text, evidence)
      const strongEvidence = evidence.some((item) => item.strength === 'STRONG')
      const moderateEvidence = evidence.some((item) => item.strength === 'MODERATE')
      if (!signals.isResponsiveToQuestion || (!signals.hasRelevantExample && !signals.hasTechnicalOrBehavioralDetail)) rating = 1
      else if (!signals.hasPersonalOwnership || (!signals.hasSpecificActions && !moderateEvidence && !strongEvidence)) rating = 2
      else if (signals.hasRelevantExample && signals.hasPersonalOwnership && (signals.hasSpecificActions || moderateEvidence || strongEvidence)) rating = 3
      if (rating === 3 && signals.hasTradeOffs && signals.hasObservableOutcome && strongEvidence) rating = 4
      if (rating === 4 && signals.hasMeasurableOutcome && signals.hasReflection && signals.hasTechnicalOrBehavioralDetail) rating = 5
      rationale = rating === 1 ? 'The mapped answer did not provide requirement-relevant evidence or a supported example.' : rating === 2 ? 'The answer was relevant but lacked clear ownership, specific action, or a supported outcome.' : rating === 3 ? 'The answer provided a relevant example, identifiable contribution, and sufficient job-related detail.' : rating === 4 ? 'The answer showed clear ownership, relevant trade-offs, strong evidence, and an observable outcome.' : 'The answer showed advanced judgment, unusual complexity, measurable impact, and reflection on alternatives.'
      if (rating !== undefined && rating <= 2) reviewReasons.push('ANSWER_NOT_RESPONSIVE')
    }
    const confidence = rating === undefined || !competencyKeys.length ? 'LOW' as const : evidence.length >= 2 && segments.length >= 2 ? 'HIGH' as const : evidence.length >= 1 ? 'MEDIUM' as const : 'LOW' as const
    if (confidence === 'LOW' && !reviewReasons.includes('INSUFFICIENT_EVIDENCE')) reviewReasons.push('INSUFFICIENT_EVIDENCE')
    const anchor = rating === undefined ? undefined : input.rubric.competencies.find((item) => competencyKeys.includes(item.competencyKey))?.anchors.find((item) => item.rating === rating)
    const createdAt = input.interviewAnalysis.approvedAt ?? input.interviewAnalysis.updatedAt
    const result: InterviewQuestionAssessment = {
      id: createQuestionAssessmentId(input.interviewId, question.id), finalEvaluationId: input.finalEvaluationId, questionId: question.id, assessmentState: assessmentState(rating), systemRating: rating, confidence, matchedAnchorRating: anchor?.rating, matchedAnchorLabel: anchor?.label,
      evidenceSummary: segments.map((item) => item.text).join(' ').slice(0, 700), rationale, transcriptSegmentIds: segments.map((item) => item.id), evidenceIds: evidence.map((item) => item.id), requirementIds: [...question.requirementIds], criterionKeys: [...question.criterionKeys], competencyKeys, reviewReasons, requiresHumanReview: confidence === 'LOW' || reviewReasons.some((item) => ['TRANSCRIPT_MAPPING_UNCERTAIN', 'RUBRIC_MAPPING_MISSING', 'CONFLICTING_EVIDENCE', 'DATA_QUALITY_ISSUE'].includes(item)), createdAt, updatedAt: createdAt,
    }
    return result
  })
  if (assessments.some((item) => item.assessmentState === 'NOT_ASSESSED')) warnings.push('Some approved questions could not be assessed from the available interview evidence.')
  return { assessments, warnings }
}

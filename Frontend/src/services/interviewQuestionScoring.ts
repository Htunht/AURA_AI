import type { FinalEvaluationGenerationInput } from '../types/finalEvaluationGeneration'
import type { AssessmentReviewReason, InterviewQuestionAssessment } from '../types/interviewQuestionAssessment'
import type { EvidenceAssessmentState, EvidenceRating } from '../types/interviewScoringRubric'
import { createQuestionAssessmentId } from '../utils/finalEvaluationIds'
import { detectInterviewEvidenceSignals } from '../utils/interviewEvidenceSignals'
import { evidenceMatchesQuestion, resolveCompetencyQuestionMatch } from './interviewCompetencyMapping'

export type QuestionScoringResult = { assessments: InterviewQuestionAssessment[]; warnings: string[] }
function assessmentState(rating?: EvidenceRating): EvidenceAssessmentState { if (rating === undefined) return 'NOT_ASSESSED'; if (rating === 1) return 'NOT_DEMONSTRATED'; if (rating === 2) return 'PARTIALLY_DEMONSTRATED'; return 'DEMONSTRATED' }

export function scoreInterviewQuestions(input: FinalEvaluationGenerationInput): QuestionScoringResult {
  const warnings: string[] = []
  const candidateSegmentIds = new Set(input.answerSegments.map((item) => item.id))
  const assessments = input.questions.filter((question) => question.status === 'APPROVED').map((question) => {
    const progress = input.sessionQuestionProgress.find((item) => item.questionId === question.id)
    const matchingEvidence = input.approvedEvidence.filter((item) => item.type !== 'MISSING_EVIDENCE' && evidenceMatchesQuestion(item, question) && (item.transcriptSegmentIds.some((id) => candidateSegmentIds.has(id)) || (item.interviewerNote?.trim().length ?? 0) >= 10))
    const evidenceSegmentIds = new Set(matchingEvidence.flatMap((item) => item.transcriptSegmentIds).filter((id) => candidateSegmentIds.has(id)))
    const segments = input.answerSegments.filter((item) => item.questionId === question.id || evidenceSegmentIds.has(item.id))
    const competencyMatches = input.rubric.competencies.flatMap((rule) => resolveCompetencyQuestionMatch(rule, question) ? [{ rule, match: resolveCompetencyQuestionMatch(rule, question)! }] : [])
    const competencyKeys = competencyMatches.map((item) => item.rule.competencyKey)
    const reviewReasons: AssessmentReviewReason[] = []
    let rating: EvidenceRating | undefined
    let rationale = ''
    if (!progress || progress.status === 'SKIPPED' || progress.status === 'NOT_REACHED' || progress.status === 'NOT_ASKED') {
      reviewReasons.push('QUESTION_NOT_REACHED'); rationale = 'The question was skipped or not reached, so no numeric rating was assigned.'
    } else if (!segments.length && !matchingEvidence.length) {
      reviewReasons.push('INSUFFICIENT_EVIDENCE', 'TRANSCRIPT_MAPPING_UNCERTAIN'); rationale = 'No candidate answer or approved supporting evidence was mapped to this assessed question.'
    } else if (!competencyKeys.length) {
      reviewReasons.push('RUBRIC_MAPPING_MISSING'); rationale = 'The answer is present, but the question is not mapped to a published competency.'
    } else {
      const text = [...segments.map((item) => item.text), ...matchingEvidence.flatMap((item) => [item.summary, item.interviewerNote ?? ''])].filter(Boolean).join(' ')
      const signals = detectInterviewEvidenceSignals(text, matchingEvidence)
      const strongEvidence = matchingEvidence.some((item) => item.strength === 'STRONG')
      const moderateEvidence = matchingEvidence.some((item) => item.strength === 'MODERATE')
      if (!signals.isResponsiveToQuestion || (!signals.hasRelevantExample && !signals.hasTechnicalOrBehavioralDetail)) rating = 1
      else if (!signals.hasPersonalOwnership || (!signals.hasSpecificActions && !moderateEvidence && !strongEvidence)) rating = 2
      else if (signals.hasRelevantExample && signals.hasPersonalOwnership && (signals.hasSpecificActions || moderateEvidence || strongEvidence)) rating = 3
      if (rating === 3 && signals.hasTradeOffs && signals.hasObservableOutcome && strongEvidence) rating = 4
      if (rating === 4 && signals.hasMeasurableOutcome && signals.hasReflection && signals.hasTechnicalOrBehavioralDetail) rating = 5
      rationale = rating === 1 ? 'The mapped answer did not provide requirement-relevant evidence or a supported example.' : rating === 2 ? 'The answer was relevant but lacked clear ownership, specific action, or a supported outcome.' : rating === 3 ? 'The answer provided a relevant example, identifiable contribution, and sufficient job-related detail.' : rating === 4 ? 'The answer showed clear ownership, relevant trade-offs, strong evidence, and an observable outcome.' : 'The answer showed advanced judgment, unusual complexity, measurable impact, and reflection on alternatives.'
      if (rating !== undefined && rating <= 2) reviewReasons.push('ANSWER_NOT_RESPONSIVE')
    }
    const confidence = rating === undefined || !competencyKeys.length ? 'LOW' as const : matchingEvidence.length >= 2 && segments.length >= 2 ? 'HIGH' as const : matchingEvidence.length >= 1 ? 'MEDIUM' as const : 'LOW' as const
    if (confidence === 'LOW' && !reviewReasons.includes('INSUFFICIENT_EVIDENCE')) reviewReasons.push('INSUFFICIENT_EVIDENCE')
    const anchor = rating === undefined ? undefined : competencyMatches[0]?.rule.anchors.find((item) => item.rating === rating)
    const createdAt = input.interviewAnalysis.approvedAt ?? input.interviewAnalysis.updatedAt
    return { id: createQuestionAssessmentId(input.interviewId, question.id), finalEvaluationId: input.finalEvaluationId, questionId: question.id, assessmentState: assessmentState(rating), systemRating: rating, confidence, matchedAnchorRating: anchor?.rating, matchedAnchorLabel: anchor?.label, evidenceSummary: [...segments.map((item) => item.text), ...matchingEvidence.map((item) => item.summary)].join(' ').slice(0, 700), rationale, transcriptSegmentIds: [...new Set(segments.map((item) => item.id))], evidenceIds: matchingEvidence.map((item) => item.id), requirementIds: [...question.requirementIds], criterionKeys: [...question.criterionKeys], competencyKeys, reviewReasons, requiresHumanReview: confidence === 'LOW' || reviewReasons.some((item) => ['TRANSCRIPT_MAPPING_UNCERTAIN', 'RUBRIC_MAPPING_MISSING', 'CONFLICTING_EVIDENCE', 'DATA_QUALITY_ISSUE'].includes(item)), createdAt, updatedAt: createdAt } satisfies InterviewQuestionAssessment
  })
  if (assessments.some((item) => item.assessmentState === 'NOT_ASSESSED')) warnings.push('Some approved questions could not be assessed from the available interview evidence.')
  return { assessments, warnings }
}

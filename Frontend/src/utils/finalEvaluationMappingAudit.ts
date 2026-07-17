import type { FinalEvaluation } from '../types/finalEvaluation'
import type { InterviewAnalysis } from '../types/interviewAnalysis'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { InterviewTranscript } from '../types/interviewTranscript'
import type { PublishedInterviewScoringRubric } from '../types/interviewScoringRubric'

export type FinalEvaluationMappingAudit = {
  publishedCompetencies: number; approvedInterviewQuestions: number; questionsWithRequirementIds: number; questionsWithCriterionKeys: number
  candidateTranscriptSegments: number; candidateTranscriptSegmentsWithQuestionId: number; approvedAnalysisEvidenceItems: number
  evidenceItemsWithTranscriptSegmentIds: number; evidenceItemsWithQuestionIds: number; evidenceItemsWithRequirementIds: number; evidenceItemsWithCriterionKeys: number
  generatedQuestionAssessments: number; assessedQuestionAssessments: number; generatedCompetencyAssessments: number; assessedCompetencyAssessments: number
}
export function buildFinalEvaluationMappingAudit(input: { rubric: PublishedInterviewScoringRubric; questionSet: InterviewQuestionSet; transcript: InterviewTranscript; analysis: InterviewAnalysis; evaluation: FinalEvaluation }): FinalEvaluationMappingAudit {
  const questions = input.questionSet.questions.filter((item) => item.status === 'APPROVED')
  const candidateSegments = input.transcript.segments.filter((item) => item.speaker === 'CANDIDATE')
  const evidence = input.analysis.status === 'APPROVED' ? input.analysis.evidence : []
  return { publishedCompetencies: input.rubric.competencies.length, approvedInterviewQuestions: questions.length, questionsWithRequirementIds: questions.filter((item) => item.requirementIds.length).length, questionsWithCriterionKeys: questions.filter((item) => item.criterionKeys.length).length, candidateTranscriptSegments: candidateSegments.length, candidateTranscriptSegmentsWithQuestionId: candidateSegments.filter((item) => item.questionId).length, approvedAnalysisEvidenceItems: evidence.length, evidenceItemsWithTranscriptSegmentIds: evidence.filter((item) => item.transcriptSegmentIds.length).length, evidenceItemsWithQuestionIds: evidence.filter((item) => item.questionIds.length).length, evidenceItemsWithRequirementIds: evidence.filter((item) => item.requirementIds.length).length, evidenceItemsWithCriterionKeys: evidence.filter((item) => item.criterionKeys.length).length, generatedQuestionAssessments: input.evaluation.questionAssessments.length, assessedQuestionAssessments: input.evaluation.questionAssessments.filter((item) => item.assessmentState !== 'NOT_ASSESSED').length, generatedCompetencyAssessments: input.evaluation.competencyAssessments.length, assessedCompetencyAssessments: input.evaluation.competencyAssessments.filter((item) => item.assessmentState !== 'NOT_ASSESSED').length }
}

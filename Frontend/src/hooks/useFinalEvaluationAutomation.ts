import { useEffect } from 'react'
import { generateFinalEvaluation } from '../services/finalEvaluationGeneration'
import { useDemoStore } from './useDemoStore'
import { deriveJobRequirements } from '../utils/jobRequirements'
import { derivePublishedInterviewScoringRubric } from '../utils/interviewScoringRubric'
import { createFinalEvaluationId, nextFinalEvaluationVersion } from '../utils/finalEvaluationIds'

export function useFinalEvaluationAutomation() {
  const { state, dispatch } = useDemoStore()
  useEffect(() => {
    state.interviewAnalyses.filter((analysis) => analysis.status === 'APPROVED' && !state.finalEvaluations.some((evaluation) => evaluation.interviewAnalysisId === analysis.id && !evaluation.supersededByEvaluationId)).forEach((analysis) => {
      const interview = state.interviews.find((item) => item.id === analysis.interviewId)
      const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined
      const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
      const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
      const rubric = job ? state.rubrics.filter((item) => item.jobId === job.id && item.status === 'PUBLISHED').sort((a, b) => b.version - a.version)[0] : undefined
      const questionSet = interview ? state.interviewQuestionSets.find((item) => item.interviewId === interview.id && item.status === 'APPROVED') : undefined
      const transcript = interview ? state.interviewTranscripts.find((item) => item.interviewId === interview.id && item.status === 'APPROVED') : undefined
      const session = interview ? state.interviewSessions.find((item) => item.interviewId === interview.id && item.status === 'COMPLETED') : undefined
      const generatedAt = new Date().toISOString()
      if (!interview || interview.status !== 'COMPLETED' || !application || !candidate || !job || !rubric || !questionSet || !transcript || !session) return
      try {
        const scoringRubric = derivePublishedInterviewScoringRubric(rubric, deriveJobRequirements(job), questionSet.questions)
        const result = generateFinalEvaluation({ candidateId: candidate.id, applicationId: application.id, jobId: job.id, interviewId: interview.id, analysisId: analysis.id, rubric: scoringRubric, questions: questionSet.questions, answerSegments: transcript.segments.filter((item) => item.speaker === 'CANDIDATE').map((item) => ({ id: item.id, questionId: item.questionId, text: item.text })), evidence: analysis.evidence, analysis, sessionProgress: session.questionProgress, existingEvaluations: state.finalEvaluations, generatedAt })
        dispatch({ type: 'ADD_FINAL_EVALUATION', payload: { evaluation: result.finalEvaluation } })
      } catch (error) {
        const version = nextFinalEvaluationVersion(state.finalEvaluations, application.id)
        dispatch({ type: 'MARK_FINAL_EVALUATION_GENERATION_FAILED', payload: { evaluation: { id: createFinalEvaluationId(candidate.id, job.id, version), version, candidateId: candidate.id, applicationId: application.id, jobId: job.id, interviewId: interview.id, interviewAnalysisId: analysis.id, rubricId: `interview-scoring-${rubric.id}`, rubricVersion: rubric.version, status: 'GENERATION_FAILED', questionAssessments: [], competencyAssessments: [], assessedWeightPercent: 0, mustHavePassed: 0, mustHaveTotal: 0, mustHaveGaps: [], unresolvedEvidence: [], dataQualityIssues: ['Evaluation generation failed.'], overallConfidence: 'LOW', systemRecommendation: 'INSUFFICIENT_EVIDENCE', systemRecommendationRationale: 'A reliable evidence score could not be prepared.', systemScoreLocked: true, systemRecommendationLocked: true, generationError: error instanceof Error ? error.message : 'Required evaluation context is unavailable.', createdAt: generatedAt, updatedAt: generatedAt } } })
      }
    })
  }, [dispatch, state])
}

import type { DemoState } from '../store/demoStateTypes'
import type { FinalEvaluation } from '../types/finalEvaluation'
import type { InterviewAnalysis } from '../types/interviewAnalysis'
import type { InterviewEvidence } from '../types/interviewEvidence'
import type { InterviewTranscript } from '../types/interviewTranscript'
import { evaluateInterviewAnalysisReadiness } from '../utils/interviewAnalysisReadiness'
import { createFinalEvaluationId, nextFinalEvaluationVersion } from '../utils/finalEvaluationIds'
import { deriveJobRequirements } from '../utils/jobRequirements'
import { createNextInterviewAnalysisId } from '../utils/interviewPostReviewIds'
import { derivePublishedInterviewScoringRubric } from '../utils/interviewScoringRubric'
import { evaluateInterviewTranscriptReadiness } from '../utils/interviewTranscriptReadiness'
import { generateFinalEvaluation } from './finalEvaluationGeneration'
import { generateInterviewAnalysis } from './interviewAnalysisGeneration'
import { generateSimulatedInterviewTranscript } from './simulatedInterviewTranscript'

export const DEMO_AUTOMATION_ACTOR = 'AURA Demo Automation'

export type DemoFastForwardStage = 'TRANSCRIPT_REVIEW' | 'ANALYSIS_REVIEW' | 'FINAL_EVALUATION' | 'FINAL_EVALUATION_FAILED'
export type DemoPostInterviewFastForwardResult = {
  interviewId: string
  candidateId: string
  stage: DemoFastForwardStage
  transcript: InterviewTranscript
  analysis?: InterviewAnalysis
  finalEvaluation?: FinalEvaluation
  blockers: string[]
  error?: string
}

export type DemoFastForwardEligibility = { eligible: boolean; reason?: string }

export function getDemoPostInterviewFastForwardRoute(result: DemoPostInterviewFastForwardResult) {
  if (result.stage === 'TRANSCRIPT_REVIEW') return `/interviews/${result.interviewId}/transcript`
  if (result.stage === 'ANALYSIS_REVIEW') return `/interviews/${result.interviewId}/analysis`
  return `/candidates/${result.candidateId}/final-evaluation`
}

export function getDemoPostInterviewFastForwardEligibility(state: DemoState, interviewId: string, demoMode = true): DemoFastForwardEligibility {
  if (!demoMode) return { eligible: false, reason: 'Demo automation is unavailable outside local demo data.' }
  const interview = state.interviews.find((item) => item.id === interviewId)
  if (!interview || interview.status !== 'COMPLETED') return { eligible: false, reason: 'Complete the interview before generating demo evaluation data.' }
  const session = state.interviewSessions.find((item) => item.interviewId === interviewId)
  if (!session || session.status !== 'COMPLETED') return { eligible: false, reason: 'Complete the interview session first.' }
  if (!state.interviewQuestionSets.some((item) => item.interviewId === interviewId && item.status === 'APPROVED')) return { eligible: false, reason: 'Approve the interview question plan first.' }
  const transcript = state.interviewTranscripts.find((item) => item.interviewId === interviewId)
  if (transcript?.source === 'MANUAL') return { eligible: false, reason: 'A manual transcript already exists for this interview.' }
  if (transcript) return { eligible: false, reason: 'A transcript already exists for this interview.' }
  if (state.interviewAnalyses.some((item) => item.interviewId === interviewId) || state.finalEvaluations.some((item) => item.interviewId === interviewId)) return { eligible: false, reason: 'Post-interview evaluation data already exists.' }
  return { eligible: true }
}

function normalizedText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function comparisonKey(value: string) {
  return normalizedText(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function uniqueText(items: string[]) {
  const seen = new Set<string>()
  return items.map(normalizedText).filter((item) => {
    const key = comparisonKey(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function uniqueValidIds(ids: string[], validIds: Set<string>) {
  return [...new Set(ids.filter((id) => validIds.has(id)))]
}

export function normalizeGeneratedInterviewAnalysis(input: {
  analysis: InterviewAnalysis
  transcript: InterviewTranscript
  state: DemoState
}): InterviewAnalysis {
  const questionSet = input.state.interviewQuestionSets.find((item) => item.interviewId === input.analysis.interviewId && item.status === 'APPROVED')
  const interview = input.state.interviews.find((item) => item.id === input.analysis.interviewId)
  const application = interview ? input.state.applications.find((item) => item.id === interview.applicationId) : undefined
  const job = application ? input.state.jobs.find((item) => item.id === application.jobId) : undefined
  const validSegments = new Set(input.transcript.segments.map((item) => item.id))
  const validQuestions = new Set(questionSet?.questions.map((item) => item.id) ?? [])
  const validRequirements = new Set(job ? deriveJobRequirements(job).map((item) => item.id) : [])
  const validCriteria = new Set(input.state.rubrics.filter((item) => item.jobId === job?.id).flatMap((item) => item.criteria.map((criterion) => criterion.key)))
  const seenEvidence = new Set<string>()
  const evidence = input.analysis.evidence.reduce<InterviewEvidence[]>((items, item) => {
    const normalized = {
      ...item,
      title: normalizedText(item.title),
      summary: normalizedText(item.summary),
      interviewerNote: item.interviewerNote ? normalizedText(item.interviewerNote) || undefined : undefined,
      transcriptSegmentIds: uniqueValidIds(item.transcriptSegmentIds, validSegments),
      questionIds: uniqueValidIds(item.questionIds, validQuestions),
      requirementIds: uniqueValidIds(item.requirementIds, validRequirements),
      criterionKeys: uniqueValidIds(item.criterionKeys, validCriteria),
    }
    const signature = comparisonKey(normalized.summary)
    if (seenEvidence.has(signature)) return items
    seenEvidence.add(signature)
    items.push({ ...normalized, id: `evidence-${input.analysis.interviewId}-${String(items.length + 1).padStart(3, '0')}`, analysisId: input.analysis.id })
    return items
  }, [])

  return {
    ...input.analysis,
    evidence,
    strengths: uniqueText(input.analysis.strengths),
    concerns: uniqueText(input.analysis.concerns),
    missingEvidence: uniqueText(input.analysis.missingEvidence),
    interviewerSummary: normalizedText(input.analysis.interviewerSummary),
    generationSummary: input.analysis.generationSummary ? normalizedText(input.analysis.generationSummary) : undefined,
  }
}

function failedEvaluation(input: { state: DemoState; analysis: InterviewAnalysis; candidateId: string; applicationId: string; jobId: string; interviewId: string; rubricId: string; rubricVersion: number; timestamp: string; error: string }): FinalEvaluation {
  const version = nextFinalEvaluationVersion(input.state.finalEvaluations, input.applicationId)
  return { id: createFinalEvaluationId(input.candidateId, input.jobId, version), version, candidateId: input.candidateId, applicationId: input.applicationId, jobId: input.jobId, interviewId: input.interviewId, interviewAnalysisId: input.analysis.id, rubricId: input.rubricId, rubricVersion: input.rubricVersion, status: 'GENERATION_FAILED', questionAssessments: [], competencyAssessments: [], assessedWeightPercent: 0, mustHavePassed: 0, mustHaveTotal: 0, mustHaveGaps: [], unresolvedEvidence: [], dataQualityIssues: ['Evaluation generation failed.'], overallConfidence: 'LOW', systemRecommendation: 'INSUFFICIENT_EVIDENCE', systemRecommendationRationale: 'A reliable evidence score could not be prepared.', systemScoreLocked: true, systemRecommendationLocked: true, generationError: input.error, createdAt: input.timestamp, updatedAt: input.timestamp }
}

export function generateCompleteDemoEvaluation(input: { state: DemoState; interviewId: string; timestamp: string; demoMode?: boolean }): DemoPostInterviewFastForwardResult {
  const eligibility = getDemoPostInterviewFastForwardEligibility(input.state, input.interviewId, input.demoMode ?? true)
  if (!eligibility.eligible) throw new Error(eligibility.reason ?? 'Demo evaluation cannot be generated.')
  const interview = input.state.interviews.find((item) => item.id === input.interviewId)!
  const session = input.state.interviewSessions.find((item) => item.interviewId === interview.id && item.status === 'COMPLETED')!
  const questionSet = input.state.interviewQuestionSets.find((item) => item.interviewId === interview.id && item.status === 'APPROVED')!
  const application = input.state.applications.find((item) => item.id === interview.applicationId)!
  const candidate = input.state.candidates.find((item) => item.id === application.candidateId)!
  const job = input.state.jobs.find((item) => item.id === application.jobId)!
  const transcriptDraft = generateSimulatedInterviewTranscript({ interview, session, questionSet, candidate, application, job, generatedAt: input.timestamp })
  const transcriptReadiness = evaluateInterviewTranscriptReadiness({ transcript: transcriptDraft, questionSet })
  if (!transcriptReadiness.ready) return { interviewId: interview.id, candidateId: candidate.id, stage: 'TRANSCRIPT_REVIEW', transcript: transcriptDraft, blockers: transcriptReadiness.blockingIssues }
  const transcript: InterviewTranscript = { ...transcriptDraft, status: 'APPROVED', approvedAt: input.timestamp, approvedBy: DEMO_AUTOMATION_ACTOR, updatedAt: input.timestamp }

  const generated = generateInterviewAnalysis({ interview, session, transcript, questionSet, application, candidate, job, requirements: deriveJobRequirements(job), screeningEvaluation: input.state.evaluations.find((item) => item.applicationId === application.id && item.evaluationType === 'SCREENING' && item.status === 'COMPLETED') })
  const analysisId = createNextInterviewAnalysisId(input.state.interviewAnalyses, interview.id)
  const analysisDraft = normalizeGeneratedInterviewAnalysis({ state: input.state, transcript, analysis: { id: analysisId, interviewId: interview.id, transcriptId: transcript.id, version: 1, status: 'DRAFT', evidence: generated.evidence.map((item) => ({ ...item, analysisId })), strengths: generated.strengths, concerns: generated.concerns, missingEvidence: generated.missingEvidence, interviewerSummary: generated.interviewerSummary, generationSummary: generated.generationSummary, createdAt: input.timestamp, updatedAt: input.timestamp } })
  const analysisReadiness = evaluateInterviewAnalysisReadiness({ analysis: analysisDraft, transcript, requirements: deriveJobRequirements(job) })
  if (!analysisReadiness.ready) return { interviewId: interview.id, candidateId: candidate.id, stage: 'ANALYSIS_REVIEW', transcript, analysis: analysisDraft, blockers: analysisReadiness.blockingIssues }
  const analysis: InterviewAnalysis = { ...analysisDraft, status: 'APPROVED', approvedAt: input.timestamp, approvedBy: DEMO_AUTOMATION_ACTOR, updatedAt: input.timestamp }
  const sourceRubric = input.state.rubrics.filter((item) => item.jobId === job.id && item.status === 'PUBLISHED').sort((a, b) => b.version - a.version)[0]
  const safeError = 'AURA could not prepare the scoring workspace. Review the published rubric and approved interview evidence, then retry.'
  if (!sourceRubric) return { interviewId: interview.id, candidateId: candidate.id, stage: 'FINAL_EVALUATION_FAILED', transcript, analysis: { ...analysis, generationError: safeError }, blockers: [], error: safeError }

  try {
    const rubric = derivePublishedInterviewScoringRubric(sourceRubric, deriveJobRequirements(job), questionSet.questions)
    const result = generateFinalEvaluation({ candidateId: candidate.id, applicationId: application.id, jobId: job.id, interviewId: interview.id, analysisId: analysis.id, rubric, questions: questionSet.questions, answerSegments: transcript.segments.filter((item) => item.speaker === 'CANDIDATE').map((item) => ({ id: item.id, questionId: item.questionId, text: item.text })), evidence: analysis.evidence, analysis, sessionProgress: session.questionProgress, existingEvaluations: input.state.finalEvaluations, generatedAt: input.timestamp })
    return { interviewId: interview.id, candidateId: candidate.id, stage: 'FINAL_EVALUATION', transcript, analysis, finalEvaluation: result.finalEvaluation, blockers: [] }
  } catch {
    return { interviewId: interview.id, candidateId: candidate.id, stage: 'FINAL_EVALUATION_FAILED', transcript, analysis, finalEvaluation: failedEvaluation({ state: input.state, analysis, candidateId: candidate.id, applicationId: application.id, jobId: job.id, interviewId: interview.id, rubricId: `interview-scoring-${sourceRubric.id}`, rubricVersion: sourceRubric.version, timestamp: input.timestamp, error: safeError }), blockers: [], error: safeError }
  }
}

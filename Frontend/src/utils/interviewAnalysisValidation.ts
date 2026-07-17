import { validateInterviewTranscriptDomain } from './interviewTranscriptValidation'
import { generateInterviewAnalysis } from '../services/interviewAnalysisGeneration'
import { createInitialDemoState } from '../store/demoInitialState'
import { demoReducer } from '../store/demoReducer'
import { deriveJobRequirements } from './jobRequirements'
import { evaluateInterviewAnalysisReadiness, removeDuplicateAnalysisListItems } from './interviewAnalysisReadiness'
import type { InterviewAnalysis } from '../types/interviewAnalysis'
import type { InterviewAnalysisGenerationInput } from '../types/interviewAnalysisGeneration'

export type InterviewAnalysisValidationResult = { valid: boolean; errors: string[] }
const check = (errors: string[], condition: unknown, message: string) => { if (!condition) errors.push(message) }

export function validateInterviewAnalysisDomain(): InterviewAnalysisValidationResult {
  const errors = [...validateInterviewTranscriptDomain().errors]
  const state = createInitialDemoState()
  const interview = state.interviews[0]
  const application = state.applications.find((item) => item.id === interview.applicationId)
  const candidate = state.candidates.find((item) => item.id === application?.candidateId)
  const job = state.jobs.find((item) => item.id === application?.jobId)
  if (!application || !candidate || !job) return { valid: false, errors: [...errors, 'Analysis fixtures unavailable.'] }
  const legacy = state.transcripts.find((item) => item.interviewId === interview.id)
  if (!legacy) return { valid: false, errors: [...errors, 'Legacy transcript fixture unavailable.'] }
  const stamp = '2026-07-17T02:00:00.000Z'
  const questionSet = { id: 'analysis-set', interviewId: interview.id, version: 1, status: 'APPROVED' as const, questions: interview.questions.map((item, index) => ({ id: item.id, interviewId: interview.id, text: item.question, category: 'TECHNICAL' as const, source: 'SYSTEM_GENERATED' as const, priority: 'CORE' as const, status: 'APPROVED' as const, estimatedMinutes: 4, order: index + 1, requirementIds: [], criterionKeys: [], evidenceReferences: [], createdAt: stamp, updatedAt: stamp })), createdAt: stamp, updatedAt: stamp }
  const transcript = { id: `transcript-${interview.id}`, interviewId: interview.id, sessionId: `session-${interview.id}`, source: 'MANUAL' as const, status: 'APPROVED' as const, rawText: legacy.fullText, segments: legacy.segments.map((item, index) => ({ id: `transcript-${interview.id}-segment-${String(index + 1).padStart(3, '0')}`, transcriptId: `transcript-${interview.id}`, order: index + 1, speaker: item.speakerType, speakerLabel: item.speakerName, text: item.text, questionId: questionSet.questions[Math.floor(index / 2)]?.id, createdAt: stamp, updatedAt: stamp })), createdAt: stamp, updatedAt: stamp, approvedAt: stamp, approvedBy: 'Recruitment Team' }
  const session = { id: `session-${interview.id}`, interviewId: interview.id, questionSetId: questionSet.id, status: 'COMPLETED' as const, questionProgress: questionSet.questions.map((item) => ({ questionId: item.id, status: 'ASKED' as const, interviewerNotes: 'Specific ownership and outcome were discussed.', followUpNotes: [] })), accumulatedActiveSeconds: 1800, generalNotes: '', createdAt: stamp, updatedAt: stamp, startedAt: stamp, completedAt: stamp }
  const requirements = deriveJobRequirements(job)
  const input: InterviewAnalysisGenerationInput = { interview, session, transcript, questionSet, candidate, application, job, requirements, screeningEvaluation: state.evaluations.find((item) => item.applicationId === application.id && item.evaluationType === 'SCREENING') }
  const snapshot = JSON.stringify(input)
  const first = generateInterviewAnalysis(input)
  const second = generateInterviewAnalysis(input)
  if (JSON.stringify(first) !== JSON.stringify(second) || JSON.stringify(input) !== snapshot) errors.push('Analysis generation is not deterministic or mutated input.')
  const segmentIds = new Set(transcript.segments.map((item) => item.id))
  if (!first.evidence.length || first.evidence.some((item) => item.transcriptSegmentIds.some((id) => !segmentIds.has(id)))) errors.push('Evidence extraction is invalid.')
  if (/\b(hire|reject|recommend hiring|final score)\b/i.test(first.interviewerSummary)) errors.push('Analysis contains a prohibited final decision or score.')
  if (!first.missingEvidence.length && input.requirements.some((item) => item.importance === 'REQUIRED')) errors.push('Missing evidence was not distinguished.')
  check(errors, new Set(first.strengths.map((item) => item.trim().toLocaleLowerCase())).size === first.strengths.length && new Set(first.concerns.map((item) => item.trim().toLocaleLowerCase())).size === first.concerns.length && new Set(first.missingEvidence.map((item) => item.trim().toLocaleLowerCase())).size === first.missingEvidence.length, 'Generated analysis contains duplicate list items.')

  const baseEvidence = first.evidence.find((item) => item.type !== 'MISSING_EVIDENCE' && item.transcriptSegmentIds.length > 0)
  if (!baseEvidence) return { valid: false, errors: [...errors, 'Evidence guidance fixture unavailable.'] }
  const invalidAnalysis: InterviewAnalysis = { id: 'analysis-guidance', interviewId: interview.id, transcriptId: transcript.id, version: 1, status: 'DRAFT', evidence: [{ ...baseEvidence, id: 'invalid-evidence', analysisId: 'analysis-guidance', title: ' ', summary: 'short', transcriptSegmentIds: [], questionIds: ['invalid-question'], requirementIds: ['invalid-requirement'], interviewerNote: undefined }], strengths: ['Supported delivery', ' supported delivery '], concerns: ['Limited detail', 'limited detail'], missingEvidence: ['No outcome metric', ' no outcome metric '], interviewerSummary: first.interviewerSummary, createdAt: stamp, updatedAt: stamp }
  const invalidReadiness = evaluateInterviewAnalysisReadiness({ analysis: invalidAnalysis, transcript, requirements, questionSet })
  const reasons = invalidReadiness.evidenceIssues[0]?.reasons ?? []
  check(errors, invalidReadiness.evidenceIssues.length === 1 && reasons.some((item) => item.field === 'title' && item.message === 'Add an evidence title.') && reasons.some((item) => item.field === 'summary' && item.message.includes('10 characters')), 'Invalid evidence did not expose exact field reasons.')
  check(errors, reasons.some((item) => item.field === 'transcriptSegmentIds' && item.message.includes('Select a supporting')), 'Missing segment mapping was not actionable.')
  check(errors, reasons.some((item) => item.field === 'questionIds') && reasons.some((item) => item.field === 'requirementIds'), 'Invalid question or requirement mapping was not identified.')
  check(errors, invalidReadiness.duplicateListItems.some((item) => item.listKey === 'strengths' && item.text === 'supported delivery') && invalidReadiness.duplicateListItems.some((item) => item.listKey === 'concerns') && invalidReadiness.duplicateListItems.some((item) => item.listKey === 'missingEvidence'), 'Duplicate list entries were not identified by list and text.')
  const cleaned = removeDuplicateAnalysisListItems(invalidAnalysis)
  check(errors, cleaned.strengths.length === 1 && cleaned.strengths[0] === 'Supported delivery' && cleaned.concerns.length === 1 && cleaned.missingEvidence.length === 1, 'Duplicate cleanup was not deterministic or did not preserve the first entry.')

  const validAnalysis: InterviewAnalysis = { ...invalidAnalysis, evidence: [{ ...baseEvidence, id: 'valid-evidence', analysisId: invalidAnalysis.id, title: 'Supported delivery evidence', summary: baseEvidence.summary.length >= 10 ? baseEvidence.summary : 'Candidate provided supported delivery evidence.', transcriptSegmentIds: [baseEvidence.transcriptSegmentIds[0]], questionIds: baseEvidence.questionIds, requirementIds: [] }], strengths: [], concerns: [], missingEvidence: [] }
  const simulatedTranscript = { ...transcript, source: 'SIMULATED' as const }
  const validReadiness = evaluateInterviewAnalysisReadiness({ analysis: validAnalysis, transcript: simulatedTranscript, requirements, questionSet })
  check(errors, validReadiness.ready && validReadiness.warnings.some((item) => item.includes('strong')) && validReadiness.warnings.some((item) => item.includes('concerns')) && validReadiness.warnings.some((item) => item.includes('simulated')), 'Warnings incorrectly blocked approval.')
  const approvalState = { ...state, interviews: state.interviews.map((item) => item.id === interview.id ? { ...item, status: 'COMPLETED' as const } : item), interviewQuestionSets: [questionSet], interviewSessions: [session], interviewTranscripts: [simulatedTranscript], interviewAnalyses: [validAnalysis], finalEvaluations: [] }
  const approved = demoReducer(approvalState, { type: 'APPROVE_INTERVIEW_ANALYSIS', payload: { analysisId: validAnalysis.id, approvedAt: stamp, approvedBy: 'Recruitment Team' } })
  check(errors, approved.interviewAnalyses[0]?.status === 'APPROVED', 'Valid analysis could not be approved.')
  return { valid: errors.length === 0, errors }
}

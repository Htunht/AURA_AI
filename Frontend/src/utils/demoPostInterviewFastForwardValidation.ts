import { demoReducer } from '../store/demoReducer'
import type { DemoState } from '../store/demoStateTypes'
import { generateCompleteDemoEvaluation, getDemoPostInterviewFastForwardEligibility, getDemoPostInterviewFastForwardRoute, normalizeGeneratedInterviewAnalysis } from '../services/demoPostInterviewFastForward'
import { generateSimulatedInterviewTranscript } from '../services/simulatedInterviewTranscript'
import type { InterviewAnalysis } from '../types/interviewAnalysis'
import { createFinalEvaluationValidationFixture } from './finalEvaluationValidationFixture'

export type DemoPostInterviewFastForwardValidationResult = { valid: boolean; errors: string[] }
const check = (errors: string[], condition: unknown, message: string) => { if (!condition) errors.push(message) }

export function validateDemoPostInterviewFastForward(): DemoPostInterviewFastForwardValidationResult {
  const errors: string[] = []
  const fixture = createFinalEvaluationValidationFixture()
  const base: DemoState = { ...fixture.state, interviewTranscripts: [], interviewAnalyses: [], finalEvaluations: [] }
  const stamp = '2026-07-17T06:00:00.000Z'

  check(errors, getDemoPostInterviewFastForwardEligibility(base, fixture.interview.id, true).eligible, 'Completed demo interview was not eligible.')
  const incomplete: DemoState = { ...base, interviews: base.interviews.map((item) => item.id === fixture.interview.id ? { ...item, status: 'SCHEDULED' } : item) }
  check(errors, !getDemoPostInterviewFastForwardEligibility(incomplete, fixture.interview.id, true).eligible, 'Incomplete interview was eligible.')
  const manual: DemoState = { ...base, interviewTranscripts: [{ ...fixture.transcript, source: 'MANUAL', status: 'DRAFT', approvedAt: undefined, approvedBy: undefined }] }
  check(errors, getDemoPostInterviewFastForwardEligibility(manual, fixture.interview.id, true).reason?.includes('manual transcript'), 'Manual transcript did not block demo fast-forward.')

  const simulated = generateSimulatedInterviewTranscript({ interview: fixture.interview, session: fixture.session, questionSet: fixture.set, candidate: fixture.candidate, application: fixture.application, job: fixture.job, generatedAt: stamp })
  const asked = new Set(fixture.session.questionProgress.filter((item) => item.status === 'ASKED').map((item) => item.questionId))
  const candidateSegments = simulated.segments.filter((item) => item.speaker === 'CANDIDATE')
  check(errors, candidateSegments.length === asked.size, 'Generated transcript did not contain exactly one answer per asked question.')
  check(errors, simulated.segments.every((item) => item.questionId && asked.has(item.questionId)), 'Skipped or not-reached question was included.')
  check(errors, !simulated.rawText.includes('I am so good at'), 'Generated transcript retained repetitive demo phrasing.')

  const duplicateAnalysis: InterviewAnalysis = { ...fixture.analysis, id: 'analysis-cleanup', status: 'DRAFT', strengths: ['  Supported delivery. ', 'supported delivery!'], concerns: [' Limited detail ', 'limited detail'], missingEvidence: ['No metric.', ' no metric '], evidence: [fixture.evidence[0], { ...fixture.evidence[0], id: 'duplicate-evidence' }].map((item) => ({ ...item, analysisId: 'analysis-cleanup', transcriptSegmentIds: [item.transcriptSegmentIds[0], item.transcriptSegmentIds[0]], questionIds: [item.questionIds[0], item.questionIds[0]] })) }
  const cleaned = normalizeGeneratedInterviewAnalysis({ analysis: duplicateAnalysis, transcript: fixture.transcript, state: fixture.state })
  check(errors, cleaned.strengths.length === 1 && cleaned.concerns.length === 1 && cleaned.missingEvidence.length === 1, 'Duplicate analysis list items were not cleaned.')
  check(errors, cleaned.evidence.length === 1 && cleaned.evidence[0].transcriptSegmentIds.length === 1, 'Duplicate evidence or mappings were not cleaned.')
  check(errors, cleaned.evidence[0].questionIds[0] === fixture.evidence[0].questionIds[0] && JSON.stringify(cleaned.evidence[0].criterionKeys) === JSON.stringify(fixture.evidence[0].criterionKeys), 'Valid analysis evidence mappings were removed during cleanup.')

  const result = generateCompleteDemoEvaluation({ state: base, interviewId: fixture.interview.id, timestamp: stamp, demoMode: true })
  check(errors, result.transcript.status === 'APPROVED' && result.transcript.approvedBy === 'AURA Demo Automation', 'Valid simulated transcript was not auto-approved.')
  check(errors, result.analysis?.status === 'APPROVED' && result.analysis.approvedBy === 'AURA Demo Automation', 'Valid generated analysis was not auto-approved.')
  check(errors, result.stage === 'FINAL_EVALUATION' && Boolean(result.finalEvaluation), 'Final evaluation was not generated.')
  check(errors, getDemoPostInterviewFastForwardRoute(result) === `/candidates/${fixture.candidate.id}/final-evaluation`, 'Success route did not navigate to final evaluation.')
  let applied = demoReducer(base, { type: 'APPLY_DEMO_POST_INTERVIEW_FAST_FORWARD', payload: { result } })
  const appliedAgain = demoReducer(applied, { type: 'APPLY_DEMO_POST_INTERVIEW_FAST_FORWARD', payload: { result } })
  check(errors, applied.interviewTranscripts.length === 1 && applied.interviewAnalyses.length === 1 && applied.finalEvaluations.length === 1, 'Fast-forward artifacts were not stored once.')
  check(errors, appliedAgain === applied, 'Duplicate fast-forward execution changed state.')

  const noAnswers: DemoState = { ...base, interviewSessions: base.interviewSessions.map((item) => item.interviewId === fixture.interview.id ? { ...item, questionProgress: item.questionProgress.map((progress) => ({ ...progress, status: 'SKIPPED' as const })) } : item) }
  const transcriptStop = generateCompleteDemoEvaluation({ state: noAnswers, interviewId: fixture.interview.id, timestamp: stamp })
  check(errors, transcriptStop.stage === 'TRANSCRIPT_REVIEW' && transcriptStop.transcript.status === 'DRAFT' && transcriptStop.blockers.length > 0, 'Invalid transcript did not stop at transcript review.')

  const shortAnswers: DemoState = { ...base, interviewSessions: base.interviewSessions.map((item) => item.interviewId === fixture.interview.id ? { ...item, questionProgress: item.questionProgress.map((progress) => ({ ...progress, status: 'ASKED' as const, interviewerNotes: 'ok' })) } : item) }
  const analysisStop = generateCompleteDemoEvaluation({ state: shortAnswers, interviewId: fixture.interview.id, timestamp: stamp })
  check(errors, analysisStop.stage === 'ANALYSIS_REVIEW' && analysisStop.transcript.status === 'APPROVED' && analysisStop.analysis?.status === 'DRAFT' && analysisStop.blockers.length > 0, 'Invalid analysis did not stop at analysis review.')

  const manualDraftState = demoReducer(base, { type: 'ADD_INTERVIEW_TRANSCRIPT', payload: { transcript: { ...fixture.transcript, source: 'MANUAL', status: 'DRAFT', approvedAt: undefined, approvedBy: undefined } } })
  check(errors, manualDraftState.interviewTranscripts[0]?.status === 'DRAFT', 'Production manual transcript was auto-approved.')
  return { valid: errors.length === 0, errors }
}

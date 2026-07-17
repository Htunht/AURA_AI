import type { FinalEvaluation } from '../types/finalEvaluation'
import type { InterviewAnalysis } from '../types/interviewAnalysis'
import type { InterviewTranscript } from '../types/interviewTranscript'

function compactHash(value: string) { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619) } return (hash >>> 0).toString(16).padStart(8, '0') }
export function fingerprintInterviewTranscript(transcript: InterviewTranscript) { return compactHash(JSON.stringify(transcript.segments.map((item) => ({ id: item.id, order: item.order, speaker: item.speaker, text: item.text.trim(), questionId: item.questionId ?? '' })))) }
export function fingerprintInterviewAnalysis(analysis: InterviewAnalysis) { return compactHash(JSON.stringify(analysis.evidence.map((item) => ({ id: item.id, type: item.type, strength: item.strength, title: item.title.trim(), summary: item.summary.trim(), transcriptSegmentIds: item.transcriptSegmentIds, questionIds: item.questionIds, requirementIds: item.requirementIds, criterionKeys: item.criterionKeys, interviewerNote: item.interviewerNote?.trim() ?? '' })))) }
export function finalEvaluationSourcesChanged(evaluation: FinalEvaluation, transcript: InterviewTranscript, analysis: InterviewAnalysis) {
  if (evaluation.sourceTranscriptFingerprint && evaluation.sourceAnalysisFingerprint) return evaluation.sourceTranscriptFingerprint !== fingerprintInterviewTranscript(transcript) || evaluation.sourceAnalysisFingerprint !== fingerprintInterviewAnalysis(analysis)
  const generatedAt = evaluation.generatedAt ?? evaluation.createdAt
  return transcript.updatedAt > generatedAt || analysis.updatedAt > generatedAt
}

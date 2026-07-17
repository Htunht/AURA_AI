import type { InterviewQuestion } from '../types/interviewQuestion'; import type { InterviewTranscriptSegment } from '../types/interviewTranscript'
const words = (value: string) => new Set(value.toLocaleLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 3))
export function mapTranscriptSegmentsToQuestions({ segments, questions }: { segments: InterviewTranscriptSegment[]; questions: InterviewQuestion[] }): InterviewTranscriptSegment[] {
  let currentQuestionId: string | undefined
  return segments.map((segment) => { if (segment.questionId) { currentQuestionId = segment.questionId; return { ...segment } } if (segment.speaker === 'INTERVIEWER') { const segmentWords = words(segment.text); const ranked = questions.map((question) => ({ id: question.id, overlap: [...words(question.text)].filter((word) => segmentWords.has(word)).length })).sort((a, b) => b.overlap - a.overlap)[0]; currentQuestionId = ranked && ranked.overlap >= 2 ? ranked.id : undefined; return { ...segment, questionId: currentQuestionId } } if (segment.speaker === 'CANDIDATE' && currentQuestionId) return { ...segment, questionId: currentQuestionId }; return { ...segment } })
}

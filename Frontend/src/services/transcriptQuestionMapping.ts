import type { InterviewQuestion } from '../types/interviewQuestion'
import type { InterviewTranscriptSegment } from '../types/interviewTranscript'

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const words = (value: string) => new Set(normalize(value).split(' ').filter((word) => word.length > 3))

export function mapTranscriptSegmentsToQuestions({ segments, questions }: { segments: InterviewTranscriptSegment[]; questions: InterviewQuestion[] }): InterviewTranscriptSegment[] {
  let currentQuestionId: string | undefined
  const validQuestionIds = new Set(questions.map((item) => item.id))
  const exactQuestions = new Map(questions.map((item) => [normalize(item.text), item.id]))
  return segments.map((segment) => {
    if (segment.speaker === 'INTERVIEWER') {
      if (segment.questionId && validQuestionIds.has(segment.questionId)) { currentQuestionId = segment.questionId; return { ...segment } }
      const exact = exactQuestions.get(normalize(segment.text))
      if (exact) { currentQuestionId = exact; return { ...segment, questionId: exact } }
      const segmentWords = words(segment.text)
      const ranked = questions.map((question) => { const questionWords = words(question.text); const overlap = [...questionWords].filter((word) => segmentWords.has(word)).length; return { id: question.id, overlap, required: Math.max(3, Math.ceil(questionWords.size * 0.6)) } }).filter((item) => item.overlap >= item.required).sort((a, b) => b.overlap - a.overlap)
      currentQuestionId = ranked.length === 1 || (ranked[0] && ranked[0].overlap > (ranked[1]?.overlap ?? 0)) ? ranked[0]?.id : undefined
      return { ...segment, questionId: currentQuestionId }
    }
    if (segment.questionId && validQuestionIds.has(segment.questionId)) return { ...segment }
    if (segment.speaker === 'CANDIDATE' && currentQuestionId) return { ...segment, questionId: currentQuestionId }
    return { ...segment }
  })
}

import type { InterviewQuestion } from '../../types/interviewQuestion'
import type { InterviewQuestionAssessment } from '../../types/interviewQuestionAssessment'
import type { InterviewTranscriptSegment } from '../../types/interviewTranscript'
import { QuestionAssessmentCard } from './QuestionAssessmentCard'

export function QuestionAssessmentList({ assessments, questions, segments, onChallenge }: { assessments: InterviewQuestionAssessment[]; questions: InterviewQuestion[]; segments: InterviewTranscriptSegment[]; onChallenge: (assessment: InterviewQuestionAssessment) => void }) {
  return <div className="grid gap-3">{assessments.map((assessment) => <QuestionAssessmentCard key={assessment.id} assessment={assessment} question={questions.find((item) => item.id === assessment.questionId)} segments={segments} onChallenge={onChallenge} />)}</div>
}

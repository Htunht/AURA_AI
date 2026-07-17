import type { FinalEvaluation } from '../../types/finalEvaluation'
import type { InterviewEvidence } from '../../types/interviewEvidence'
import type { InterviewTranscriptSegment } from '../../types/interviewTranscript'
import type { PublishedInterviewScoringRubric } from '../../types/interviewScoringRubric'
import { CompetencyAssessmentCard } from './CompetencyAssessmentCard'

export function CompetencyAssessmentList({ evaluation, transcriptSegments, rubric, evidence = [] }: { evaluation: FinalEvaluation; transcriptSegments: InterviewTranscriptSegment[]; rubric: PublishedInterviewScoringRubric; evidence?: InterviewEvidence[] }) {
  return <div className="grid gap-3">{evaluation.competencyAssessments.map((competency) => <CompetencyAssessmentCard key={competency.id} competency={competency} questions={evaluation.questionAssessments.filter((item) => competency.questionAssessmentIds.includes(item.id))} transcriptSegments={transcriptSegments} anchors={rubric.competencies.find((item) => item.competencyKey === competency.competencyKey)?.anchors ?? []} evidence={evidence} />)}</div>
}

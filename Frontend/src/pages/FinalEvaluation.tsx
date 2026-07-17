import { useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CompetencyAssessmentList } from '../components/evaluation/CompetencyAssessmentList'
import { EvaluationChallengeDialog } from '../components/evaluation/EvaluationChallengeDialog'
import { EvaluationChallengeList } from '../components/evaluation/EvaluationChallengeList'
import { FinalEvaluationDecisionBrief } from '../components/evaluation/FinalEvaluationDecisionBrief'
import { HumanFinalDecision, type FinalDecisionDraft } from '../components/evaluation/HumanFinalDecision'
import { PostDecisionNextStep } from '../components/evaluation/PostDecisionNextStep'
import { MustHaveGateSummary } from '../components/evaluation/MustHaveGateSummary'
import { QuestionAssessmentList } from '../components/evaluation/QuestionAssessmentList'
import { PageContainer } from '../components/layout/PageContainer'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { demoWorkspaceMode } from '../config/workspaceMode'
import { useAuth } from '../hooks/useAuth'
import { useDemoStore } from '../hooks/useDemoStore'
import { generateFinalEvaluation } from '../services/finalEvaluationGeneration'
import { selectEvaluationChallengesByEvaluationId, selectFinalEvaluationViewModel, selectFinalEvaluationsByCandidateId } from '../store/demoSelectors'
import type { EvaluationChallengeReason } from '../types/evaluationChallenge'
import type { InterviewQuestionAssessment } from '../types/interviewQuestionAssessment'
import { evaluateFinalEvaluationReadiness } from '../utils/finalEvaluationReadiness'
import { createEvaluationChallengeId } from '../utils/finalEvaluationIds'
import { finalEvaluationSourcesChanged } from '../utils/finalEvaluationSourceFingerprint'

const linkClass = 'inline-flex h-9 items-center justify-center rounded-aura-sm px-3 text-sm font-semibold text-harbor no-underline hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'
function EvidenceSection({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) { const [open, setOpen] = useState(defaultOpen); return <section className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs"><button type="button" aria-expanded={open} className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 bg-white px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-glacier sm:px-6" onClick={() => setOpen((value) => !value)}><span className="flex items-center gap-2"><span className="text-base font-semibold text-depth">{title}</span>{count !== undefined ? <span className="rounded-full bg-frost px-2 py-0.5 text-[11px] font-bold text-harbor">{count}</span> : null}</span><span className="shrink-0 text-xs font-semibold text-harbor">{open ? 'Hide' : 'View'}</span></button>{open ? <div className="border-t border-harbor/10 bg-frost/25 p-4 sm:p-5">{children}</div> : null}</section> }

export default function FinalEvaluation() {
  const { candidateId = '' } = useParams(); const location = useLocation(); const { state, dispatch } = useDemoStore(); const { currentUser } = useAuth(); const [challengeAssessment, setChallengeAssessment] = useState<InterviewQuestionAssessment>(); const [recalculateOpen, setRecalculateOpen] = useState(false); const fastForwardError = (location.state as { demoFastForwardError?: string } | null)?.demoFastForwardError
  const view = selectFinalEvaluationViewModel(state, candidateId); const versions = selectFinalEvaluationsByCandidateId(state, candidateId); const candidate = state.candidates.find((item) => item.id === candidateId)
  if (!candidate) return <PageContainer title="Candidate not found"><Card className="p-8 text-sm text-aura-text-secondary">Candidate record unavailable.</Card></PageContainer>
  if (!view) { const application = state.applications.find((item) => item.candidateId === candidateId); const interview = application ? state.interviews.find((item) => item.applicationId === application.id) : undefined; const analysis = interview ? state.interviewAnalyses.find((item) => item.interviewId === interview.id) : undefined; const preparationError = fastForwardError ?? analysis?.generationError; return <PageContainer title={preparationError ? 'Final evaluation needs attention' : analysis?.status !== 'APPROVED' ? 'Analysis approval required' : 'Preparing final evaluation'} actions={interview ? <Link className={linkClass} to={`/interviews/${interview.id}/analysis`}>Review analysis</Link> : undefined}><Card className={`p-6 text-sm ${preparationError ? 'border-aura-danger/25 bg-aura-danger-soft text-aura-danger' : 'text-aura-text-secondary'}`} role={preparationError ? 'alert' : undefined}>{preparationError ?? (interview ? 'Preparing evaluation.' : 'A completed interview is required.')}</Card></PageContainer> }
  const { evaluation, application, job, interview, analysis, rubric } = view; const transcript = state.interviewTranscripts.find((item) => item.interviewId === interview.id); const set = state.interviewQuestionSets.find((item) => item.interviewId === interview.id && item.status === 'APPROVED'); const session = state.interviewSessions.find((item) => item.interviewId === interview.id && item.status === 'COMPLETED'); const challenges = selectEvaluationChallengesByEvaluationId(state, evaluation.id); const readiness = evaluateFinalEvaluationReadiness(evaluation, challenges)
  if (evaluation.status === 'GENERATION_FAILED') return <PageContainer title="Final evaluation failed" actions={<Link className={linkClass} to={`/interviews/${interview.id}/analysis`}>Review analysis</Link>}><Card className="border-aura-danger/25 bg-aura-danger-soft p-6" role="alert"><p className="m-0 text-sm text-aura-danger">{evaluation.generationError ?? fastForwardError ?? 'The evaluation could not be prepared.'}</p></Card></PageContainer>
  if (!transcript || !set || !session) return <PageContainer title="Evaluation data missing"><Link className={linkClass} to={`/interviews/${interview.id}`}>Review interview</Link></PageContainer>
  function openChallenge(reason: EvaluationChallengeReason, explanation: string) { if (!challengeAssessment) return; const now = new Date().toISOString(); const competencyIds = evaluation.competencyAssessments.filter((item) => challengeAssessment.competencyKeys.includes(item.competencyKey)).map((item) => item.id); dispatch({ type: 'ADD_EVALUATION_CHALLENGE', payload: { actorRole: currentUser.role, challenge: { id: createEvaluationChallengeId(state.evaluationChallenges, evaluation.id), finalEvaluationId: evaluation.id, reason, explanation, questionAssessmentIds: [challengeAssessment.id], competencyAssessmentIds: competencyIds, transcriptSegmentIds: [...challengeAssessment.transcriptSegmentIds], evidenceIds: [...challengeAssessment.evidenceIds], status: 'OPEN', createdBy: currentUser.name, createdAt: now } } }); setChallengeAssessment(undefined) }
  function recordDecision(draft: FinalDecisionDraft) { dispatch({ type: 'RECORD_HUMAN_FINAL_DECISION', payload: { finalEvaluationId: evaluation.id, ...draft, decidedBy: currentUser.name, decidedByRole: currentUser.role, decidedAt: new Date().toISOString() } }) }
  function recalculate() { if (!set || !transcript || !session) return; const generatedAt = new Date().toISOString(); const result = generateFinalEvaluation({ candidateId, applicationId: application.id, jobId: job.id, interviewId: interview.id, analysisId: analysis.id, rubric, questions: set.questions, answerSegments: transcript.segments.filter((item) => item.speaker === 'CANDIDATE').map((item) => ({ id: item.id, questionId: item.questionId, text: item.text })), evidence: analysis.evidence, analysis, transcript, sessionProgress: session.questionProgress, existingEvaluations: state.finalEvaluations, generatedAt }); dispatch({ type: 'ADD_RECALCULATED_FINAL_EVALUATION', payload: { previousEvaluationId: evaluation.id, evaluation: result.finalEvaluation } }); setRecalculateOpen(false) }
  const sourcesChanged = finalEvaluationSourcesChanged(evaluation, transcript, analysis)
  const canRecalculate = evaluation.status !== 'DECIDED' && sourcesChanged
  const openChallenges = challenges.filter((item) => item.status === 'OPEN').length
  return <PageContainer title="Final evaluation" hideHeader>
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-depth">Final evaluation</h1>
        <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{candidate.fullName} · {job.title}</p>
      </div>
      <Link className={linkClass} to={`/candidates/${candidate.id}`}>Candidate profile</Link>
    </header>
    {sourcesChanged ? <Card className="mb-4 border-aura-warning/35 bg-aura-warning-soft p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="m-0 text-sm font-semibold text-depth">Evidence changed. Recalculate to use the latest version.</p>{canRecalculate ? <Button variant="secondary" onClick={() => setRecalculateOpen(true)}>Recalculate</Button> : null}</div></Card> : null}
    <FinalEvaluationDecisionBrief evaluation={evaluation} readiness={readiness} challenges={challenges} />

    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <main className="grid content-start gap-3" id="evaluation-evidence">
        <div className="px-1 pb-1 pt-2"><h2 className="m-0 text-lg font-semibold text-depth">Evidence</h2></div>
        <EvidenceSection title="Competencies" count={evaluation.competencyAssessments.length} defaultOpen={!readiness.readyForDecision}>
          <div className="grid gap-4"><MustHaveGateSummary evaluation={evaluation} /><CompetencyAssessmentList evaluation={evaluation} transcriptSegments={transcript.segments} rubric={rubric} evidence={analysis.evidence} /></div>
        </EvidenceSection>
        <EvidenceSection title="Interview answers" count={evaluation.questionAssessments.length}>
          <QuestionAssessmentList assessments={evaluation.questionAssessments} questions={set.questions} segments={transcript.segments} onChallenge={setChallengeAssessment} />
        </EvidenceSection>
        <EvidenceSection title="Evidence challenges" count={openChallenges} defaultOpen={openChallenges > 0}>
          <EvaluationChallengeList challenges={challenges} actorRole={currentUser.role} onResolve={(challengeId) => dispatch({ type: 'RESOLVE_EVALUATION_CHALLENGE', payload: { challengeId, resolutionNote: 'The underlying transcript or evidence mapping was corrected and reviewed.', resolvedAt: new Date().toISOString(), actorRole: currentUser.role } })} onDismiss={(challengeId) => dispatch({ type: 'DISMISS_EVALUATION_CHALLENGE', payload: { challengeId, resolutionNote: 'The challenge was reviewed and did not require an evidence correction.', resolvedAt: new Date().toISOString(), actorRole: currentUser.role } })} />
        </EvidenceSection>
        {versions.length > 1 ? <EvidenceSection title="Evaluation history" count={versions.length}><div className="grid gap-2">{versions.map((item) => <div className="flex justify-between rounded-aura-sm bg-white p-3 text-sm" key={item.id}><span>Version {item.version} · {item.status.replaceAll('_', ' ').toLocaleLowerCase()}</span><span className="text-aura-text-muted">{item.weightedEvidenceScore === undefined || item.assessedWeightPercent < 70 ? 'Score unavailable' : `${item.weightedEvidenceScore}/100`}</span></div>)}</div></EvidenceSection> : null}
      </main>
      <aside className="grid gap-4 xl:sticky xl:top-4" id="final-human-decision"><HumanFinalDecision evaluation={evaluation} actor={currentUser} ready={readiness.readyForDecision} demoMode={demoWorkspaceMode} onRecord={recordDecision} />{evaluation.status === 'DECIDED' || evaluation.reopenedFromEvaluationId ? <PostDecisionNextStep candidateId={candidate.id} showReturn /> : null}</aside>
    </div>
    <EvaluationChallengeDialog open={Boolean(challengeAssessment)} assessment={challengeAssessment} onClose={() => setChallengeAssessment(undefined)} onSubmit={openChallenge} />
    <Dialog open={recalculateOpen} title="Recalculate evaluation?" onClose={() => setRecalculateOpen(false)}><p className="mt-0 text-sm leading-6 text-aura-text-secondary">This creates a new version from the current evidence.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setRecalculateOpen(false)}>Cancel</Button><Button onClick={recalculate}>Recalculate</Button></div></Dialog>
  </PageContainer>
}

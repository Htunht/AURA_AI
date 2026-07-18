import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AddInterviewQuestionDialog } from '../../components/interviews/AddInterviewQuestionDialog'
import { InterviewQuestionApproval } from '../../components/interviews/InterviewQuestionApproval'
import { InterviewQuestionCoverage } from '../../components/interviews/InterviewQuestionCoverage'
import { InterviewQuestionEditor, type InterviewQuestionDraft } from '../../components/interviews/InterviewQuestionEditor'
import { InterviewQuestionList } from '../../components/interviews/InterviewQuestionList'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { useDemoStore } from '../../hooks/useDemoStore'
import { useInterviewQuestionAutomation } from '../../hooks/useInterviewQuestionAutomation'
import { selectInterviewQuestionPreparationStatus, selectInterviewQuestionSetReadiness, selectLatestInterviewQuestionSet } from '../../store/demoSelectors'
import type { InterviewQuestion } from '../../types/interviewQuestion'
import { createNextInterviewQuestionId } from '../../utils/interviewQuestionIds'
import { deriveJobRequirements } from '../../utils/jobRequirements'
import { formatInterviewDate, formatInterviewTime } from '../../utils/helpers'

const linkClass = 'inline-flex h-9 items-center justify-center rounded-aura-sm px-3 text-sm font-semibold text-harbor no-underline hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewQuestionReview() {
  const { interviewId = '' } = useParams()
  const navigate = useNavigate()
  const { state, dispatch } = useDemoStore()
  const automation = useInterviewQuestionAutomation()
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<InterviewQuestion>()
  const [deleting, setDeleting] = useState<InterviewQuestion>()
  const interview = state.interviews.find((item) => item.id === interviewId)
  const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined
  const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
  const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
  const questionSet = selectLatestInterviewQuestionSet(state, interviewId)
  const readiness = selectInterviewQuestionSetReadiness(state, interviewId)
  const status = selectInterviewQuestionPreparationStatus(state, interviewId)
  if (!interview || !application || !candidate || !job) return <PageContainer eyebrow="Interview preparation" title="Interview not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The interview preparation record could not be resolved.</Card></PageContainer>
  const duration = Math.round((Date.parse(interview.scheduledEnd) - Date.parse(interview.scheduledStart)) / 60_000)
  if (!questionSet || status === 'PREPARING') return <PageContainer title="Preparing interview questions"><Card className="p-8 text-center"><Badge tone="accent">Preparing</Badge></Card></PageContainer>
  if (questionSet.status === 'GENERATION_FAILED') return <PageContainer eyebrow="Interview preparation" title="Question preparation needs attention"><Card className="border-aura-warning/25 p-6"><h2 className="m-0 text-lg font-semibold text-depth">AURA could not prepare the interview plan</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{questionSet.generationError}</p><Button className="mt-5" onClick={() => automation.retryPreparation(interview.id)}>Try again</Button></Card></PageContainer>
  if (!readiness) return null
  const editable = questionSet.status === 'DRAFT'
  const now = () => new Date().toISOString()
  function addQuestion(draft: InterviewQuestionDraft, afterQuestionId?: string) {
    const updatedAt = now()
    dispatch({ type: 'ADD_INTERVIEW_QUESTION', payload: { questionSetId: questionSet!.id, afterQuestionId, updatedAt, question: { ...draft, id: createNextInterviewQuestionId(questionSet!.questions, interview!.id), interviewId: interview!.id, source: 'INTERVIEWER_ADDED', status: 'DRAFT', order: questionSet!.questions.length + 1, requirementIds: [], criterionKeys: [], evidenceReferences: [], createdAt: updatedAt, updatedAt } } })
    setAddOpen(false)
  }
  function duplicate(question: InterviewQuestion) {
    const text = `${question.text.replace(/\?$/, '')} — follow-up?`
    const updatedAt = now()
    dispatch({ type: 'ADD_INTERVIEW_QUESTION', payload: { questionSetId: questionSet!.id, afterQuestionId: question.id, updatedAt, question: { ...question, id: createNextInterviewQuestionId(questionSet!.questions, interview!.id), text, source: 'INTERVIEWER_ADDED', status: 'DRAFT', order: question.order + 1, createdAt: updatedAt, updatedAt } } })
  }
  return <PageContainer title="Interview questions" hideHeader>
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-depth">Interview questions</h1>
        <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{candidate.fullName} · {job.title}</p>
      </div>
      <Link className={linkClass} to={`/interviews/${interview.id}`}>Interview details</Link>
    </header>
    <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2 border-y border-harbor/10 py-3 text-sm text-aura-text-secondary">
      <span>{formatInterviewDate(interview.scheduledStart)} · {formatInterviewTime(interview.scheduledStart)}</span>
      <span>{duration} min interview</span>
      <span>{readiness.questionCount} questions</span>
      <span>{readiness.estimatedMinutes} min planned</span>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"><main><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="m-0 text-lg font-semibold text-depth">Question plan</h2><Badge tone={editable ? 'neutral' : 'success'}>{editable ? 'Draft' : 'Approved'}</Badge></div>{editable ? <Button onClick={() => setAddOpen(true)}><Plus size={15} />Add question</Button> : null}</div><InterviewQuestionList questions={[...questionSet.questions].sort((a, b) => a.order - b.order)} editable={editable} onEdit={setEditing} onDuplicate={duplicate} onDelete={setDeleting} onMove={(questionId, direction) => dispatch({ type: 'MOVE_INTERVIEW_QUESTION', payload: { questionSetId: questionSet.id, questionId, direction, updatedAt: now() } })} onDrag={(questionId, overQuestionId) => dispatch({ type: 'MOVE_INTERVIEW_QUESTION', payload: { questionSetId: questionSet.id, questionId, overQuestionId, updatedAt: now() } })} /></main><aside className="grid content-start gap-4"><InterviewQuestionCoverage requirements={deriveJobRequirements(job)} readiness={readiness} /><InterviewQuestionApproval questionSet={questionSet} readiness={readiness} sessionPath={`/interviews/${interview.id}/session`} onApprove={() => { dispatch({ type: 'APPROVE_INTERVIEW_QUESTION_SET', payload: { questionSetId: questionSet.id, approvedAt: now(), approvedBy: 'Recruitment Team' } }); navigate(`/interviews/${interview.id}/session`) }} onRegenerate={() => automation.regenerateQuestions(interview.id)} /></aside></div>
    <AddInterviewQuestionDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={addQuestion} />
    <Dialog open={Boolean(editing)} title="Edit interview question" onClose={() => setEditing(undefined)}>{editing ? <InterviewQuestionEditor initial={editing} submitLabel="Save changes" onCancel={() => setEditing(undefined)} onSubmit={(changes) => { dispatch({ type: 'UPDATE_INTERVIEW_QUESTION', payload: { questionSetId: questionSet.id, questionId: editing.id, changes, updatedAt: now() } }); setEditing(undefined) }} /> : null}</Dialog>
    <Dialog open={Boolean(deleting)} title="Remove interview question?" onClose={() => setDeleting(undefined)}>{deleting ? <><p className="mt-0 text-sm leading-6 text-aura-text-secondary">This question will be removed from the draft plan.</p>{deleting.priority === 'CORE' && deleting.requirementIds.length ? <p className="mb-0 mt-3 rounded-aura-sm bg-aura-warning-soft p-3 text-sm font-semibold text-aura-warning">This core question covers a required qualification. Removing it may block plan approval until coverage is restored.</p> : null}<div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleting(undefined)}>Keep question</Button><Button variant="danger" disabled={questionSet.questions.length === 1} onClick={() => { dispatch({ type: 'REMOVE_INTERVIEW_QUESTION', payload: { questionSetId: questionSet.id, questionId: deleting.id, updatedAt: now() } }); setDeleting(undefined) }}>Remove question</Button></div></> : null}</Dialog>
  </PageContainer>
}

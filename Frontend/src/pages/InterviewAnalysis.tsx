import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectInterviewTranscriptByInterviewId, selectLatestInterviewAnalysis } from '../store/demoSelectors'
import type { InterviewEvidence } from '../types/interviewEvidence'
import { evaluateInterviewAnalysisReadiness, removeDuplicateAnalysisListItems, type AnalysisListKey, type EvidenceIssueField } from '../utils/interviewAnalysisReadiness'
import { deriveJobRequirements } from '../utils/jobRequirements'
import { createNextInterviewEvidenceId } from '../utils/interviewPostReviewIds'

const fieldClass = 'mt-2 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2 text-sm text-depth focus:outline-none focus:ring-2 focus:ring-glacier/35 disabled:bg-frost'
const invalidFieldClass = 'border-aura-danger/55 focus:ring-aura-danger/25'
const linkClass = 'inline-flex h-9 items-center justify-center rounded-aura-sm px-3 text-sm font-semibold text-harbor no-underline hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewAnalysis() {
  const { interviewId = '' } = useParams()
  const location = useLocation()
  const { state, dispatch } = useDemoStore()
  const [approveOpen, setApproveOpen] = useState(false)
  const evidenceCards = useRef<Record<string, HTMLElement | null>>({})
  const interview = state.interviews.find((item) => item.id === interviewId)
  const transcript = selectInterviewTranscriptByInterviewId(state, interviewId)
  const analysis = selectLatestInterviewAnalysis(state, interviewId)
  const questionSet = state.interviewQuestionSets.find((item) => item.interviewId === interviewId && item.status === 'APPROVED')
  const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined
  const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
  const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
  const fastForwardBlockers = (location.state as { demoFastForwardBlockers?: string[] } | null)?.demoFastForwardBlockers ?? []
  const now = () => new Date().toISOString()

  if (!interview || !candidate || !job || !transcript || transcript.status !== 'APPROVED' || !questionSet) return <PageContainer title="Transcript approval required"><Link className={linkClass} to={`/interviews/${interviewId}/transcript`}>Review transcript</Link></PageContainer>
  if (!analysis) return <PageContainer title="Preparing interview evidence"><Card className="p-6 text-center"><Badge tone="accent">Preparing</Badge></Card></PageContainer>
  if (analysis.status === 'GENERATION_FAILED') return <PageContainer title="Analysis preparation failed"><Card className="p-6"><p className="m-0 text-sm text-aura-danger">{analysis.generationError}</p><div className="mt-4 flex flex-wrap gap-2"><Link className={linkClass} to={`/interviews/${interview.id}/transcript`}>Review transcript</Link><Button onClick={() => dispatch({ type: 'RETRY_INTERVIEW_ANALYSIS_GENERATION', payload: { analysisId: analysis.id } })}>Try again</Button></div></Card></PageContainer>

  const requirements = deriveJobRequirements(job)
  const readiness = evaluateInterviewAnalysisReadiness({ analysis, transcript, requirements, questionSet })
  const editable = analysis.status === 'DRAFT'
  const candidateSegments = transcript.segments.filter((item) => item.speaker === 'CANDIDATE')
  const updateList = (key: AnalysisListKey, value: string) => dispatch({ type: 'UPDATE_INTERVIEW_ANALYSIS_CONTENT', payload: { analysisId: analysis.id, [key]: value.split('\n').map((item) => item.trim()).filter(Boolean), updatedAt: now() } })
  const updateEvidence = (evidenceId: string, changes: Partial<Pick<InterviewEvidence, 'title' | 'summary' | 'transcriptSegmentIds' | 'questionIds' | 'requirementIds'>>) => dispatch({ type: 'UPDATE_INTERVIEW_EVIDENCE', payload: { analysisId: analysis.id, evidenceId, changes, updatedAt: now() } })
  const removeDuplicate = (key: AnalysisListKey, index: number) => {
    const items = [...analysis[key]]
    items.splice(index, 1)
    dispatch({ type: 'UPDATE_INTERVIEW_ANALYSIS_CONTENT', payload: { analysisId: analysis.id, [key]: items, updatedAt: now() } })
  }
  const cleanGeneratedLists = () => {
    const cleaned = removeDuplicateAnalysisListItems(analysis)
    dispatch({ type: 'UPDATE_INTERVIEW_ANALYSIS_CONTENT', payload: { analysisId: analysis.id, ...cleaned, updatedAt: now() } })
  }
  const reviewFirstIssue = () => {
    const first = readiness.evidenceIssues[0]
    if (!first) return
    const card = evidenceCards.current[first.evidenceId]
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    card?.focus({ preventScroll: true })
  }

  const analysisStatus = analysis.status === 'APPROVED' && analysis.approvedBy === 'AURA Demo Automation'
    ? 'Demo-approved analysis'
    : analysis.status === 'APPROVED'
      ? 'Approved'
      : 'Draft'

  return <PageContainer title="Interview analysis" hideHeader>
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-depth">Interview analysis</h1>
        <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{candidate.fullName} · {job.title}</p>
      </div>
      <Link className={linkClass} to={`/interviews/${interview.id}/transcript`}>View transcript</Link>
    </header>
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Badge tone={analysis.status === 'APPROVED' ? 'success' : 'neutral'}>{analysisStatus}</Badge>
      <span className="text-sm text-aura-text-muted">{analysis.evidence.length} evidence items</span>
    </div>
    {fastForwardBlockers.length ? <Card className="mb-4 border-aura-danger/25 bg-aura-danger-soft p-4" role="alert"><p className="m-0 text-sm font-semibold text-aura-danger">Demo automation stopped at analysis review.</p>{fastForwardBlockers.map((item) => <p className="mb-0 mt-1 text-sm text-aura-danger" key={item}>{item}</p>)}</Card> : null}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <main className="grid gap-4">
        <Card className="p-5"><label className="text-sm font-semibold text-depth">Interviewer summary<textarea className={`${fieldClass} min-h-32`} disabled={!editable} value={analysis.interviewerSummary} onChange={(event) => dispatch({ type: 'UPDATE_INTERVIEW_ANALYSIS_CONTENT', payload: { analysisId: analysis.id, interviewerSummary: event.target.value, updatedAt: now() } })} /></label></Card>
        <div className="grid gap-3">{analysis.evidence.map((evidence, evidenceIndex) => {
          const issue = readiness.evidenceIssues.find((item) => item.evidenceId === evidence.id)
          const errorsFor = (field: EvidenceIssueField) => issue?.reasons.filter((item) => item.field === field) ?? []
          const titleErrors = errorsFor('title'); const summaryErrors = errorsFor('summary'); const segmentErrors = errorsFor('transcriptSegmentIds'); const questionErrors = errorsFor('questionIds'); const requirementErrors = errorsFor('requirementIds')
          const validSegmentId = evidence.transcriptSegmentIds.find((id) => transcript.segments.some((item) => item.id === id)) ?? ''
          const validQuestionId = evidence.questionIds.find((id) => questionSet.questions.some((item) => item.id === id)) ?? ''
          const validRequirementId = evidence.requirementIds.find((id) => requirements.some((item) => item.id === id)) ?? ''
          return <section className="rounded-aura-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aura-danger/35" key={evidence.id} ref={(node) => { evidenceCards.current[evidence.id] = node }} tabIndex={-1}>
            <Card className={`p-5 ${issue ? 'border-aura-danger/45 bg-aura-danger-soft/20' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-2"><Badge tone={evidence.strength === 'STRONG' ? 'success' : evidence.strength === 'LIMITED' ? 'warning' : 'accent'}>{evidence.strength.toLocaleLowerCase()}</Badge><Badge tone="neutral">{evidence.type.toLocaleLowerCase().replaceAll('_', ' ')}</Badge></div>{issue ? <Badge tone="warning">Needs correction</Badge> : null}</div>
              {issue ? <p className="mb-0 mt-3 text-xs font-semibold text-aura-danger" role="alert">Evidence item {evidenceIndex + 1} needs correction</p> : null}
              <label className="mt-3 block text-xs font-semibold text-aura-text-muted">Title<input aria-invalid={Boolean(titleErrors.length)} className={`${fieldClass} ${titleErrors.length ? invalidFieldClass : ''}`} disabled={!editable} value={evidence.title} onChange={(event) => updateEvidence(evidence.id, { title: event.target.value })} /></label>{titleErrors.map((error) => <p className="mb-0 mt-1 text-xs font-medium text-aura-danger" key={error.message}>{error.message}</p>)}
              <label className="mt-3 block text-xs font-semibold text-aura-text-muted">Summary<textarea aria-invalid={Boolean(summaryErrors.length)} className={`${fieldClass} min-h-24 ${summaryErrors.length ? invalidFieldClass : ''}`} disabled={!editable} value={evidence.summary} onChange={(event) => updateEvidence(evidence.id, { summary: event.target.value })} /></label>{summaryErrors.map((error) => <p className="mb-0 mt-1 text-xs font-medium text-aura-danger" key={error.message}>{error.message}</p>)}
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="text-xs font-semibold text-aura-text-muted">Supporting transcript segment<select aria-invalid={Boolean(segmentErrors.length)} className={`${fieldClass} ${segmentErrors.length ? invalidFieldClass : ''}`} disabled={!editable} value={validSegmentId} onChange={(event) => updateEvidence(evidence.id, { transcriptSegmentIds: event.target.value ? [event.target.value] : [] })}><option value="">No supporting segment</option>{transcript.segments.map((segment) => <option key={segment.id} value={segment.id}>Segment {segment.order} · {segment.speaker.toLocaleLowerCase()}: {segment.text.slice(0, 60)}</option>)}</select>{segmentErrors.map((error) => <span className="mt-1 block text-xs font-medium leading-5 text-aura-danger" key={error.message}>{error.message}</span>)}</label>
                <label className="text-xs font-semibold text-aura-text-muted">Interview question<select aria-invalid={Boolean(questionErrors.length)} className={`${fieldClass} ${questionErrors.length ? invalidFieldClass : ''}`} disabled={!editable} value={validQuestionId} onChange={(event) => updateEvidence(evidence.id, { questionIds: event.target.value ? [event.target.value] : [] })}><option value="">No question mapping</option>{questionSet.questions.map((question) => <option key={question.id} value={question.id}>{question.order}. {question.text}</option>)}</select>{questionErrors.map((error) => <span className="mt-1 block text-xs font-medium leading-5 text-aura-danger" key={error.message}>{error.message}</span>)}</label>
                <label className="text-xs font-semibold text-aura-text-muted">Job requirement<select aria-invalid={Boolean(requirementErrors.length)} className={`${fieldClass} ${requirementErrors.length ? invalidFieldClass : ''}`} disabled={!editable} value={validRequirementId} onChange={(event) => updateEvidence(evidence.id, { requirementIds: event.target.value ? [event.target.value] : [] })}><option value="">No requirement mapping</option>{requirements.map((requirement) => <option key={requirement.id} value={requirement.id}>{requirement.label}</option>)}</select>{requirementErrors.map((error) => <span className="mt-1 block text-xs font-medium leading-5 text-aura-danger" key={error.message}>{error.message}</span>)}</label>
              </div>
              <blockquote className="mb-0 mt-3 rounded-aura-sm bg-frost p-3 text-xs leading-5 text-aura-text-secondary">{evidence.transcriptSegmentIds.slice(0, 3).map((id) => transcript.segments.find((item) => item.id === id)?.text).filter(Boolean).join(' · ') || (evidence.type === 'MISSING_EVIDENCE' ? 'Missing evidence does not require a supporting transcript segment.' : 'Select a candidate answer that supports this evidence.')}</blockquote>
              {editable ? <Button className="mt-3 h-8" variant="ghost" onClick={() => dispatch({ type: 'REMOVE_INTERVIEW_EVIDENCE', payload: { analysisId: analysis.id, evidenceId: evidence.id, updatedAt: now() } })}>Delete evidence</Button> : null}
            </Card>
          </section>
        })}</div>
        {editable ? <Button variant="secondary" onClick={() => { const segment = candidateSegments[0]; if (!segment) return; const createdAt = now(); dispatch({ type: 'ADD_INTERVIEW_EVIDENCE', payload: { analysisId: analysis.id, updatedAt: createdAt, evidence: { id: createNextInterviewEvidenceId(analysis.evidence, interview.id), analysisId: analysis.id, type: 'EXPERIENCE', strength: 'MODERATE', title: 'Interviewer-added evidence', summary: segment.text, transcriptSegmentIds: [segment.id], questionIds: segment.questionId ? [segment.questionId] : [], requirementIds: [], criterionKeys: [], createdAt, updatedAt: createdAt } } }) }}>Add supported evidence</Button> : null}
        <div><h2 className="mb-3 mt-0 text-lg font-semibold text-depth">Summary</h2><div className="grid gap-4 md:grid-cols-3">{([['strengths', 'Strengths'], ['concerns', 'Concerns'], ['missingEvidence', 'Missing evidence']] as const).map(([key, label]) => {
          const duplicates = readiness.duplicateListItems.filter((item) => item.listKey === key)
          return <Card className={duplicates.length ? 'border-aura-danger/35 p-4' : 'p-4'} key={key}><label className="text-sm font-semibold text-depth">{label}<textarea aria-invalid={Boolean(duplicates.length)} className={`${fieldClass} min-h-36 ${duplicates.length ? invalidFieldClass : ''}`} disabled={!editable} value={analysis[key].join('\n')} onChange={(event) => updateList(key, event.target.value)} /></label>{duplicates.map((duplicate) => <div className="mt-3 rounded-aura-sm bg-aura-danger-soft p-3" key={`${duplicate.listKey}-${duplicate.duplicateIndex}`}><p className="m-0 break-words text-xs text-aura-danger">“{duplicate.text}” is duplicated.</p>{editable ? <Button className="mt-2 h-8" variant="ghost" onClick={() => removeDuplicate(key, duplicate.duplicateIndex)}>Remove duplicate</Button> : null}</div>)}</Card>
        })}</div></div>
      </main>
      <aside><Card className="p-5 xl:sticky xl:top-4"><h2 className="m-0 text-base font-semibold text-depth">Review status</h2>{readiness.generalBlockingIssues.map((item) => <p className="mb-0 mt-3 text-sm text-aura-danger" key={item}>{item}</p>)}{readiness.evidenceIssues.length ? <div className="mt-4 rounded-aura-sm bg-aura-danger-soft p-3"><p className="m-0 text-sm font-semibold text-aura-danger">{readiness.evidenceIssues.length} evidence {readiness.evidenceIssues.length === 1 ? 'item needs' : 'items need'} correction</p><Button className="mt-2 h-8" variant="ghost" onClick={reviewFirstIssue}>Review first issue</Button></div> : null}{readiness.duplicateListItems.length ? <div className="mt-4 rounded-aura-sm bg-aura-danger-soft p-3"><p className="m-0 text-sm font-semibold text-aura-danger">{readiness.duplicateListItems.length} duplicate {readiness.duplicateListItems.length === 1 ? 'entry' : 'entries'}</p>{editable ? <Button className="mt-2 h-8" variant="ghost" onClick={cleanGeneratedLists}>Remove duplicates</Button> : null}</div> : null}{readiness.warnings.map((item) => <p className="mb-0 mt-3 text-xs text-aura-warning" key={item}>{item}</p>)}{editable ? <Button className="mt-5 w-full" disabled={!readiness.ready} onClick={() => setApproveOpen(true)}>Approve analysis</Button> : <><p className="mb-0 mt-3 text-sm text-aura-text-secondary">Approved by {analysis.approvedBy}</p><Link className={`${linkClass} mt-3 w-full bg-frost`} to={`/candidates/${candidate.id}`}>View candidate</Link></>}</Card></aside>
    </div>
    <Dialog open={approveOpen} title="Approve interview analysis?" onClose={() => setApproveOpen(false)}><p className="mt-0 text-sm text-aura-text-secondary">Approval makes the analysis available for final evaluation.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button><Button onClick={() => { dispatch({ type: 'APPROVE_INTERVIEW_ANALYSIS', payload: { analysisId: analysis.id, approvedAt: now(), approvedBy: 'Recruitment Team' } }); setApproveOpen(false) }}>Approve analysis</Button></div></Dialog>
  </PageContainer>
}

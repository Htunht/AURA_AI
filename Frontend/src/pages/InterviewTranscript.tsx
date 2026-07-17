import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { DemoEvaluationFastForwardAction } from '../components/interviews/DemoEvaluationFastForwardAction'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { useDemoStore } from '../hooks/useDemoStore'
import { mapTranscriptSegmentsToQuestions } from '../services/transcriptQuestionMapping'
import { parseInterviewTranscript } from '../services/interviewTranscriptParsing'
import { generateSimulatedInterviewTranscript } from '../services/simulatedInterviewTranscript'
import {
  selectApprovedInterviewQuestionSet,
  selectInterviewSessionByInterviewId,
  selectInterviewTranscriptByInterviewId,
  selectInterviewTranscriptReadiness,
} from '../store/demoSelectors'
import type { TranscriptSpeaker } from '../types/interviewTranscript'
import { createInterviewTranscriptId, createNextTranscriptSegmentId } from '../utils/interviewPostReviewIds'

const inputClass = 'w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2 text-sm text-depth focus:outline-none focus:ring-2 focus:ring-glacier/35 disabled:bg-frost'
const linkClass = 'inline-flex h-9 items-center justify-center rounded-aura-sm px-3 text-sm font-semibold text-harbor no-underline hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'

export default function InterviewTranscript() {
  const { interviewId = '' } = useParams()
  const location = useLocation()
  const { state, dispatch } = useDemoStore()
  const [approveOpen, setApproveOpen] = useState(false)
  const interview = state.interviews.find((item) => item.id === interviewId)
  const session = selectInterviewSessionByInterviewId(state, interviewId)
  const set = selectApprovedInterviewQuestionSet(state, interviewId)
  const transcript = selectInterviewTranscriptByInterviewId(state, interviewId)
  const application = interview ? state.applications.find((item) => item.id === interview.applicationId) : undefined
  const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
  const job = application ? state.jobs.find((item) => item.id === application.jobId) : undefined
  const readiness = selectInterviewTranscriptReadiness(state, interviewId)
  const fastForwardBlockers = (location.state as { demoFastForwardBlockers?: string[] } | null)?.demoFastForwardBlockers ?? []
  const now = () => new Date().toISOString()

  if (!interview || !application || !candidate || !job) {
    return <PageContainer title="Transcript unavailable"><Card className="p-6 text-sm text-aura-text-secondary">Required interview references could not be resolved.</Card></PageContainer>
  }

  if (interview.status === 'CANCELLED') {
    return <PageContainer title="Transcript unavailable"><Card className="p-6 text-sm text-aura-text-secondary">This interview was cancelled.</Card></PageContainer>
  }

  if (interview.status !== 'COMPLETED' || session?.status !== 'COMPLETED' || !set) {
    return <PageContainer title="Complete the interview first"><Link className={linkClass} to={`/interviews/${interview.id}/session`}>Open interview session</Link></PageContainer>
  }

  function addManual() {
    const createdAt = now()
    dispatch({
      type: 'ADD_INTERVIEW_TRANSCRIPT',
      payload: {
        transcript: {
          id: createInterviewTranscriptId(interview!.id),
          interviewId: interview!.id,
          sessionId: session!.id,
          source: 'MANUAL',
          status: 'DRAFT',
          rawText: '',
          segments: [],
          createdAt,
          updatedAt: createdAt,
        },
      },
    })
  }

  function generateDemo() {
    dispatch({
      type: 'ADD_INTERVIEW_TRANSCRIPT',
      payload: {
        transcript: generateSimulatedInterviewTranscript({
          interview: interview!,
          session: session!,
          questionSet: set!,
          candidate: candidate!,
          application: application!,
          job: job!,
          generatedAt: now(),
        }),
      },
    })
  }

  function parse() {
    if (!transcript) return
    const parsed = parseInterviewTranscript({
      transcriptId: transcript.id,
      interviewId: interview!.id,
      rawText: transcript.rawText,
      createdAt: now(),
    })
    const mapped = mapTranscriptSegmentsToQuestions({ segments: parsed.segments, questions: set!.questions })
    dispatch({
      type: 'REPLACE_INTERVIEW_TRANSCRIPT_SEGMENTS',
      payload: { transcriptId: transcript.id, segments: mapped, updatedAt: now() },
    })
  }

  const pageHeader = (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-depth">Transcript</h1>
        <p className="mb-0 mt-1 text-sm text-aura-text-secondary">{candidate.fullName} · {job.title}</p>
      </div>
      <Link className={linkClass} to={`/interviews/${interview.id}`}>Interview details</Link>
    </header>
  )

  if (!transcript) {
    return <PageContainer title="Transcript" hideHeader>
      {pageHeader}
      <Card className="max-w-3xl p-5 shadow-none">
        <div className="flex flex-wrap gap-3">
          <Button onClick={addManual}>Paste transcript</Button>
          <Button variant="secondary" onClick={generateDemo}>Generate demo transcript</Button>
          <DemoEvaluationFastForwardAction interviewId={interview.id} />
        </div>
      </Card>
    </PageContainer>
  }

  const editable = transcript.status === 'DRAFT'
  const transcriptStatus = transcript.status === 'APPROVED' && transcript.approvedBy === 'AURA Demo Automation'
    ? 'Demo-approved transcript'
    : transcript.status === 'APPROVED'
      ? 'Approved'
      : 'Draft'

  return <PageContainer title="Transcript" hideHeader>
    {pageHeader}
    <div className="mb-5 flex flex-wrap gap-2">
      <Badge tone={transcript.source === 'SIMULATED' ? 'warning' : 'accent'}>{transcript.source === 'SIMULATED' ? 'Simulated transcript' : 'Manual transcript'}</Badge>
      <Badge tone={transcript.status === 'APPROVED' ? 'success' : 'neutral'}>{transcriptStatus}</Badge>
    </div>

    {fastForwardBlockers.length ? <Card className="mb-4 border-aura-danger/25 bg-aura-danger-soft p-4" role="alert">
      <p className="m-0 text-sm font-semibold text-aura-danger">Demo automation stopped at transcript review.</p>
      {fastForwardBlockers.map((item) => <p className="mb-0 mt-1 text-sm text-aura-danger" key={item}>{item}</p>)}
    </Card> : null}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <main className="grid gap-4">
        <Card className="p-5">
          <label className="text-sm font-semibold text-depth">
            Raw transcript
            <textarea
              className={`${inputClass} mt-2 min-h-72`}
              disabled={!editable}
              maxLength={100000}
              value={transcript.rawText}
              onChange={(event) => dispatch({ type: 'UPDATE_INTERVIEW_TRANSCRIPT_RAW_TEXT', payload: { transcriptId: transcript.id, rawText: event.target.value, updatedAt: now() } })}
            />
          </label>
          {editable ? <div className="mt-3 flex justify-end"><Button variant="secondary" onClick={parse}>Parse transcript</Button></div> : null}
        </Card>

        <div className="grid gap-3">
          {transcript.segments.map((segment, index) => <Card className={`p-4 ${segment.speaker === 'CANDIDATE' ? 'border-l-2 border-l-marine' : ''}`} key={segment.id}>
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <label className="text-xs font-semibold text-aura-text-muted">
                Speaker
                <select className={`${inputClass} mt-1`} disabled={!editable} value={segment.speaker} onChange={(event) => dispatch({ type: 'UPDATE_INTERVIEW_TRANSCRIPT_SEGMENT', payload: { transcriptId: transcript.id, segmentId: segment.id, changes: { speaker: event.target.value as TranscriptSpeaker }, updatedAt: now() } })}>
                  <option value="INTERVIEWER">Interviewer</option>
                  <option value="CANDIDATE">Candidate</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-aura-text-muted">
                Segment {segment.order}
                <textarea className={`${inputClass} mt-1 min-h-24`} disabled={!editable} value={segment.text} onChange={(event) => dispatch({ type: 'UPDATE_INTERVIEW_TRANSCRIPT_SEGMENT', payload: { transcriptId: transcript.id, segmentId: segment.id, changes: { text: event.target.value }, updatedAt: now() } })} />
              </label>
              <label className="text-xs font-semibold text-aura-text-muted sm:col-start-2">
                Question
                <select className={`${inputClass} mt-1`} disabled={!editable} value={segment.questionId ?? ''} onChange={(event) => dispatch({ type: 'UPDATE_INTERVIEW_TRANSCRIPT_SEGMENT', payload: { transcriptId: transcript.id, segmentId: segment.id, changes: { questionId: event.target.value || undefined }, updatedAt: now() } })}>
                  <option value="">Not mapped</option>
                  {set.questions.map((question) => <option key={question.id} value={question.id}>{question.order}. {question.text}</option>)}
                </select>
              </label>
            </div>
            {editable ? <div className="mt-3 flex gap-2">
              <Button className="h-8" variant="ghost" disabled={index === 0} onClick={() => dispatch({ type: 'MOVE_INTERVIEW_TRANSCRIPT_SEGMENT', payload: { transcriptId: transcript.id, segmentId: segment.id, direction: 'UP', updatedAt: now() } })}>Move up</Button>
              <Button className="h-8" variant="ghost" disabled={index === transcript.segments.length - 1} onClick={() => dispatch({ type: 'MOVE_INTERVIEW_TRANSCRIPT_SEGMENT', payload: { transcriptId: transcript.id, segmentId: segment.id, direction: 'DOWN', updatedAt: now() } })}>Move down</Button>
              <Button className="h-8" variant="ghost" onClick={() => dispatch({ type: 'REMOVE_INTERVIEW_TRANSCRIPT_SEGMENT', payload: { transcriptId: transcript.id, segmentId: segment.id, updatedAt: now() } })}>Delete</Button>
            </div> : null}
          </Card>)}
        </div>

        {editable ? <Button variant="secondary" onClick={() => {
          const createdAt = now()
          dispatch({
            type: 'ADD_INTERVIEW_TRANSCRIPT_SEGMENT',
            payload: {
              transcriptId: transcript.id,
              updatedAt: createdAt,
              segment: {
                id: createNextTranscriptSegmentId(transcript.segments, interview.id),
                transcriptId: transcript.id,
                order: transcript.segments.length + 1,
                speaker: 'UNKNOWN',
                text: 'Add transcript text here.',
                createdAt,
                updatedAt: createdAt,
              },
            },
          })
        }}>Add segment</Button> : null}
      </main>

      <aside>
        <Card className="p-5">
          <h2 className="m-0 text-base font-semibold text-depth">Review status</h2>
          {readiness ? <>
            {readiness.blockingIssues.map((item) => <p className="mb-0 mt-3 text-sm text-aura-danger" key={item}>{item}</p>)}
            {readiness.warnings.map((item) => <p className="mb-0 mt-3 text-xs text-aura-warning" key={item}>{item}</p>)}
          </> : null}
          {editable
            ? <Button className="mt-5 w-full" disabled={!readiness?.ready} onClick={() => setApproveOpen(true)}>Approve transcript</Button>
            : <>
              <p className="mb-0 mt-3 text-sm text-aura-text-secondary">Approved by {transcript.approvedBy}</p>
              <Link className={`${linkClass} mt-3 w-full bg-frost`} to={`/interviews/${interview.id}/analysis`}>Review analysis</Link>
            </>}
        </Card>
      </aside>
    </div>

    <Dialog open={approveOpen} title="Approve interview transcript?" onClose={() => setApproveOpen(false)}>
      <p className="mt-0 text-sm text-aura-text-secondary">Approval makes the transcript read-only and prepares interview analysis.</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button>
        <Button onClick={() => {
          dispatch({ type: 'APPROVE_INTERVIEW_TRANSCRIPT', payload: { transcriptId: transcript.id, approvedAt: now(), approvedBy: 'Recruitment Team' } })
          setApproveOpen(false)
        }}>Approve transcript</Button>
      </div>
    </Dialog>
  </PageContainer>
}

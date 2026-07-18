import { ArrowLeft, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CandidateProfile } from '../../components/candidates/CandidateProfile'
import { CandidateApplicationSelector } from '../../components/candidates/CandidateApplicationSelector'
import { CandidateCurrentAction } from '../../components/candidates/CandidateCurrentAction'
import { CandidateRecruitmentProgress } from '../../components/candidates/CandidateRecruitmentProgress'
import { CandidateTimeline } from '../../components/candidates/CandidateTimeline'
import { CandidateInterviewPanel } from '../../components/interviews/CandidateInterviewPanel'
import { CandidateInterviewWorkflow } from '../../components/interviews/CandidateInterviewWorkflow'
import { CandidateScreeningPanel } from '../../components/screening/CandidateScreeningPanel'
import { PostDecisionNextStep } from '../../components/evaluation/PostDecisionNextStep'
import { backendWorkspaceMode } from '../../config/workspaceMode'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Tabs, type TabItem } from '../../components/ui/Tabs'
import { useDemoStore } from '../../hooks/useDemoStore'
import {
  selectApplicationFormsByJobId,
  selectCandidateApplications,
  selectCandidateById,
  selectCandidateTimeline,
  selectInterviewByApplicationId,
  selectInterviewAnalysisPreparationStatus,
  selectInterviewQuestionPreparationStatus,
  selectInterviewSessionOperationalStatus,
  selectInterviewSessionByInterviewId,
  selectInterviewTranscriptByInterviewId,
  selectLatestInterviewAnalysis,
  selectLatestFinalEvaluation,
  selectEvaluationChallengesByEvaluationId,
} from '../../store/demoSelectors'
import type { ApplicationAnswer } from '../../types/application'
import { candidateTabAvailability } from '../../utils/candidateDetailPresentation'
import { formatApplicationStage, formatApplicationStatus, formatDateTime } from '../../utils/helpers'
import BackendScreeningDetail from '../backend/BackendScreeningDetail'

const backLinkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#1E2022]/30 bg-transparent px-4 text-sm font-semibold text-[#1E2022]/85 no-underline transition-all hover:border-[#1E2022] hover:text-[#1E2022] hover:bg-[#1E2022]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2022]'

function renderAnswerValue(answer: ApplicationAnswer) {
  if (Array.isArray(answer.value)) {
    return answer.value.length ? <div className="flex flex-wrap gap-1.5">{answer.value.map((value) => <Badge key={value} tone="accent">{value}</Badge>)}</div> : <span className="text-aura-text-muted">Not provided</span>
  }
  if (typeof answer.value === 'boolean') return answer.value ? 'Yes' : 'No'
  if (answer.value === '') return <span className="text-aura-text-muted">Not provided</span>
  return String(answer.value)
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return <div className="mb-4"><h2 className="m-0 text-lg font-semibold text-depth">{title}</h2>{description ? <p className="mb-0 mt-1 text-xs text-aura-text-muted">{description}</p> : null}</div>
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return <Card className="p-8 text-center md:p-12"><span className="mx-auto mb-4 inline-grid size-11 place-items-center rounded-full bg-glacier/15 text-lg font-bold text-marine">A</span><h2 className="m-0 text-lg font-semibold text-depth">{title}</h2><p className="mx-auto mb-0 mt-2 max-w-xl text-sm leading-6 text-aura-text-secondary">{description}</p></Card>
}

export default function CandidateDetail() {
  const { candidateId = '' } = useParams()
  if (backendWorkspaceMode) return <BackendScreeningDetail applicationId={candidateId} />
  return <DemoCandidateDetail candidateId={candidateId} />
}

function DemoCandidateDetail({ candidateId }: { candidateId: string }) {
  const { state } = useDemoStore()
  const candidate = selectCandidateById(state, candidateId)
  const applications = selectCandidateApplications(state, candidateId)
  const [selectedApplicationId, setSelectedApplicationId] = useState(applications[0]?.application.id ?? '')
  const [activeTab, setActiveTab] = useState('application')
  const [previewMessageFor, setPreviewMessageFor] = useState<string>()
  const selected = applications.find((item) => item.application.id === selectedApplicationId) ?? applications[0]

  if (!candidate) {
    return <PageContainer eyebrow="Candidate profile" title="Candidate not found" actions={<Link className={backLinkClass} to="/candidates"><ArrowLeft size={16} aria-hidden="true" />Back to candidates</Link>}><Card className="p-8 text-center"><p className="m-0 text-sm text-aura-text-secondary">The requested candidate profile does not exist or is no longer available.</p></Card></PageContainer>
  }

  if (!selected) {
    return <PageContainer eyebrow="Candidate profile" title={candidate.fullName} actions={<Link className={backLinkClass} to="/candidates"><ArrowLeft size={16} aria-hidden="true" />Back to candidates</Link>}><Card className="p-8 text-center"><p className="m-0 text-sm text-aura-text-secondary">No applications are associated with this candidate.</p></Card></PageContainer>
  }

  const { application, job } = selected
  const forms = selectApplicationFormsByJobId(state, job.id)
  const formVersion = forms[0]?.version
  const timeline = selectCandidateTimeline(state, application.id)
  const interview = selectInterviewByApplicationId(state, application.id)
  const sessionStatus = interview ? selectInterviewSessionOperationalStatus(state, interview.id) : 'UNAVAILABLE'
  const session = interview ? selectInterviewSessionByInterviewId(state, interview.id) : undefined
  const questionPlanStatus = interview ? selectInterviewQuestionPreparationStatus(state, interview.id) : undefined
  const transcript = interview ? selectInterviewTranscriptByInterviewId(state, interview.id) : undefined
  const analysis = interview ? selectLatestInterviewAnalysis(state, interview.id) : undefined
  const reviewStatus = interview ? selectInterviewAnalysisPreparationStatus(state, interview.id) : undefined
  const finalEvaluation = selectLatestFinalEvaluation(state, candidate.id, application.id)
  const finalChallenges = finalEvaluation ? selectEvaluationChallengesByEvaluationId(state, finalEvaluation.id) : []
  const detailItems = [
    ['Full name', candidate.fullName],
    ['Email', candidate.email],
    ['Phone', candidate.phone],
    ['Current position', candidate.currentPosition],
    ['Location', candidate.location],
    ['Years of experience', `${candidate.yearsExperience} years`],
  ]
  const tabAvailability = candidateTabAvailability({
    stage: application.currentStage,
    hasInterview: Boolean(interview),
    hasFinalEvaluation: Boolean(finalEvaluation),
  })
  const candidateTabs: TabItem[] = [
    { id: 'application', label: 'Application' },
    { id: 'screening', label: 'AI Screening' },
    {
      id: 'interview',
      label: 'Interview',
      disabled: !tabAvailability.interviewAvailable,
      availabilityText: 'After screening review',
    },
    {
      id: 'final',
      label: 'Final Evaluation',
      disabled: !tabAvailability.finalEvaluationAvailable,
      availabilityText: 'After interview evidence',
    },
    { id: 'timeline', label: 'Timeline' },
  ]

  return (
    <PageContainer
      eyebrow="Candidate profile"
      title={candidate.fullName}
      hideHeader
    >
      <div className="mx-auto max-w-[1240px]">
      <CandidateProfile
        candidate={candidate}
        application={application}
        job={job}
        operationalLabel={interview?.status === 'CANCELLED' ? 'Interview cancelled · rescheduling required' : undefined}
        applicationSelector={applications.length > 1 ? <CandidateApplicationSelector applications={applications} selectedApplicationId={application.id} onChange={(applicationId) => { setSelectedApplicationId(applicationId); setActiveTab('application') }} /> : undefined}
        progress={<CandidateRecruitmentProgress stage={application.currentStage} embedded />}
      />
      <CandidateCurrentAction
        application={application}
        candidateId={candidate.id}
        interview={interview}
        sessionStatus={sessionStatus}
        reviewStatus={reviewStatus}
        finalEvaluation={finalEvaluation}
        onSelectTab={setActiveTab}
      />
      <Tabs
        items={candidateTabs}
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="Candidate detail views"
        compact
      />

      {activeTab === 'application' ? (
        <section className="overflow-hidden rounded-aura-md bg-white shadow-aura-xs">
          <div className="grid xl:grid-cols-[1.2fr_0.8fr]">
          <div className="divide-y divide-harbor/10">
            <section className="p-5 md:p-6">
              <SectionHeading title="Candidate details" description="Contact and professional information supplied with this profile." />
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {detailItems.map(([label, value]) => <div className="border-b border-harbor/10 pb-3" key={label}><dt className="text-[10px] font-bold uppercase tracking-[0.11em] text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1.5 text-sm font-medium text-depth">{value}</dd></div>)}
              </dl>
            </section>

            <section className="p-5 md:p-6">
              <SectionHeading title="Application answers" description="Responses submitted for this specific role." />
              <dl className="grid gap-5">
                {application.answers.map((answer) => <div className="border-b border-harbor/10 pb-5 last:border-0 last:pb-0" key={answer.id}><dt className="text-sm font-semibold text-depth">{answer.label}</dt><dd className="mb-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-aura-text-secondary">{renderAnswerValue(answer)}</dd></div>)}
              </dl>
            </section>
          </div>

          <aside className="divide-y divide-harbor/10 bg-frost/30 xl:border-l xl:border-harbor/10">
            <section className="p-5 md:p-6">
              <SectionHeading title="Skills" />
              <div className="flex flex-wrap gap-2">{candidate.skills.map((skill) => <span className="rounded-full border border-marine/15 bg-glacier/15 px-2.5 py-1 text-xs font-semibold text-harbor" key={skill}>{skill}</span>)}</div>
            </section>

            <section className="p-5 md:p-6">
              <SectionHeading title="Documents" />
              {application.documents.length ? <div className="grid gap-3">{application.documents.map((document) => <div className="rounded-aura-sm border border-harbor/10 bg-frost/55 p-3" key={document.id}><div className="flex items-start gap-3"><span className="inline-grid size-9 flex-none place-items-center rounded-aura-sm bg-white text-marine shadow-aura-xs"><FileText size={17} aria-hidden="true" /></span><div className="min-w-0"><p className="m-0 text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">{document.documentType}</p><p className="mb-0 mt-1 truncate text-sm font-semibold text-depth">{document.fileName}</p></div></div><Button className="mt-3 h-9 w-full" variant="secondary" onClick={() => setPreviewMessageFor(document.id)}>View document</Button>{previewMessageFor === document.id ? <p className="mb-0 mt-2 text-xs leading-5 text-aura-text-muted" role="status">Document preview is not available in this workspace.</p> : null}</div>)}</div> : <p className="m-0 text-sm text-aura-text-secondary">No documents were submitted.</p>}
            </section>

            <section className="p-5 md:p-6">
              <SectionHeading title="Application metadata" />
              <dl className="grid gap-3 text-sm">
                <div><dt className="text-xs text-aura-text-muted">Application ID</dt><dd className="mb-0 mt-1 break-all font-mono text-xs text-aura-text-secondary">{application.id}</dd></div>
                <div><dt className="text-xs text-aura-text-muted">Submitted</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatDateTime(application.submittedAt)}</dd></div>
                <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-aura-text-muted">Status</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatApplicationStatus(application.status)}</dd></div><div><dt className="text-xs text-aura-text-muted">Current stage</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatApplicationStage(application.currentStage)}</dd></div></div>
                <div><dt className="text-xs text-aura-text-muted">Job title</dt><dd className="mb-0 mt-1 font-medium text-depth">{job.title}</dd></div>
                <div><dt className="text-xs text-aura-text-muted">Application form version</dt><dd className="mb-0 mt-1 font-medium text-depth">{formVersion ? `Version ${formVersion}` : 'Not available'}</dd></div>
              </dl>
            </section>
          </aside>
          </div>
        </section>
      ) : null}

      {activeTab === 'timeline' ? <Card className="p-5 md:p-6"><SectionHeading title="Activity timeline" description="Recorded milestones for this application, shown in chronological order." /><CandidateTimeline events={timeline} /></Card> : null}
      {activeTab === 'screening' ? <CandidateScreeningPanel applicationId={application.id} /> : null}
      {activeTab === 'interview' ? interview ? (
        <CandidateInterviewWorkflow
          candidateId={candidate.id}
          interview={interview}
          questionPlanStatus={questionPlanStatus ?? 'NOT_PREPARED'}
          sessionStatus={sessionStatus}
          session={session}
          transcript={transcript}
          analysis={analysis}
          reviewStatus={reviewStatus ?? 'TRANSCRIPT_REQUIRED'}
          finalEvaluation={finalEvaluation}
        />
      ) : <CandidateInterviewPanel applicationId={application.id} /> : null}
      {activeTab === 'final' ? finalEvaluation ? <Card className="p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-depth">Final evaluation</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Standardized evidence scoring from the approved interview record.</p></div><Badge tone={finalEvaluation.status === 'DECIDED' ? 'success' : finalEvaluation.status === 'DRAFT' ? 'warning' : 'accent'}>{finalEvaluation.status.replaceAll('_', ' ').toLocaleLowerCase()}</Badge></div><dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-aura-text-muted">System evidence score</dt><dd className="mb-0 mt-1 font-semibold text-depth">{finalEvaluation.weightedEvidenceScore === undefined ? 'Unavailable' : `${finalEvaluation.weightedEvidenceScore} / 100`}</dd></div><div><dt className="text-xs text-aura-text-muted">Assessed coverage</dt><dd className="mb-0 mt-1 font-semibold text-depth">{finalEvaluation.assessedWeightPercent}% · {finalEvaluation.overallConfidence.toLocaleLowerCase()} confidence</dd></div><div><dt className="text-xs text-aura-text-muted">Must-have gates</dt><dd className="mb-0 mt-1 font-semibold text-depth">{finalEvaluation.mustHavePassed} of {finalEvaluation.mustHaveTotal} passed</dd></div><div><dt className="text-xs text-aura-text-muted">System recommendation</dt><dd className="mb-0 mt-1 font-semibold text-depth">{finalEvaluation.systemRecommendation.replaceAll('_', ' ').toLocaleLowerCase()}</dd></div><div><dt className="text-xs text-aura-text-muted">Human final decision</dt><dd className="mb-0 mt-1 font-semibold text-depth">{finalEvaluation.humanDecision?.toLocaleLowerCase() ?? 'Not recorded'}</dd></div><div><dt className="text-xs text-aura-text-muted">Decision authority</dt><dd className="mb-0 mt-1 font-semibold text-depth">{finalEvaluation.decidedByRole?.replaceAll('_', ' ').toLocaleLowerCase() ?? 'Hiring manager'}</dd></div><div><dt className="text-xs text-aura-text-muted">Open challenges</dt><dd className="mb-0 mt-1 font-semibold text-depth">{finalChallenges.filter((item) => item.status === 'OPEN').length}</dd></div></dl><Link className={`${backLinkClass} mt-5`} to={`/candidates/${candidate.id}/final-evaluation`}>{finalEvaluation.status === 'DECIDED' ? 'View final decision' : finalEvaluation.status === 'READY_FOR_DECISION' ? 'Record final decision' : 'Review final evaluation'}</Link></Card> : <Placeholder title="Final evaluation" description="Approve the interview analysis to prepare standardized evidence scoring." /> : null}
      {activeTab === 'final' && finalEvaluation?.status === 'DECIDED' ? <div className="mt-4"><PostDecisionNextStep candidateId={candidate.id} /></div> : null}
      </div>
    </PageContainer>
  )
}

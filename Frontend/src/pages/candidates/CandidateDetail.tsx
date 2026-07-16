import { ArrowLeft, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CandidateProfile } from '../../components/candidates/CandidateProfile'
import { CandidateTimeline } from '../../components/candidates/CandidateTimeline'
import { CandidateInterviewPanel } from '../../components/interviews/CandidateInterviewPanel'
import { CandidateScreeningPanel } from '../../components/screening/CandidateScreeningPanel'
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
  selectInterviewSessionOperationalStatus,
  selectInterviewSessionByInterviewId,
  selectInterviewSessionProgressSummary,
} from '../../store/demoSelectors'
import type { ApplicationAnswer } from '../../types/application'
import { formatApplicationStage, formatApplicationStatus, formatDateTime } from '../../utils/helpers'

const tabs: TabItem[] = [
  { id: 'application', label: 'Application' },
  { id: 'screening', label: 'AI Screening' },
  { id: 'interview', label: 'Interview' },
  { id: 'final', label: 'Final Evaluation' },
  { id: 'timeline', label: 'Timeline' },
]

const backLinkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-transparent px-4 text-sm font-semibold text-[#446e87] no-underline transition-all shadow-[0_0_8px_rgba(114,163,191,0.25)] hover:bg-[#72a3bf]/15 hover:shadow-[0_0_14px_rgba(114,163,191,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

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
  const sessionProgress = session ? selectInterviewSessionProgressSummary(session) : undefined
  const detailItems = [
    ['Full name', candidate.fullName],
    ['Email', candidate.email],
    ['Phone', candidate.phone],
    ['Current position', candidate.currentPosition],
    ['Location', candidate.location],
    ['Years of experience', `${candidate.yearsExperience} years`],
  ]

  return (
    <PageContainer
      eyebrow="Candidate profile"
      title={candidate.fullName}
      description={`${candidate.currentPosition} · ${candidate.location} · ${candidate.yearsExperience} years experience`}
      actions={<Link className={backLinkClass} to="/candidates"><ArrowLeft size={16} aria-hidden="true" />Back to candidates</Link>}
    >
      {applications.length > 1 ? (
        <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="m-0 text-sm font-semibold text-depth">Application context</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">This candidate has applied to {applications.length} roles.</p></div>
          <label className="grid gap-1.5 sm:min-w-72"><span className="sr-only">Select an application</span><select className="h-10 rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35" value={application.id} onChange={(event) => setSelectedApplicationId(event.target.value)}>{applications.map((item) => <option key={item.application.id} value={item.application.id}>{item.job.title} · {formatDateTime(item.application.submittedAt)}</option>)}</select></label>
        </Card>
      ) : null}

      <CandidateProfile candidate={candidate} application={application} job={job} />
      <Tabs
        items={tabs}
        activeId={activeTab}
        onChange={setActiveTab}
        ariaLabel="Candidate detail views"
      />

      {activeTab === 'application' ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            <Card className="p-5 md:p-6">
              <SectionHeading title="Candidate details" description="Contact and professional information supplied with this profile." />
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {detailItems.map(([label, value]) => <div className="border-b border-harbor/10 pb-3" key={label}><dt className="text-[10px] font-bold uppercase tracking-[0.11em] text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1.5 text-sm font-medium text-depth">{value}</dd></div>)}
              </dl>
            </Card>

            <Card className="p-5 md:p-6">
              <SectionHeading title="Application answers" description="Responses submitted for this specific role." />
              <dl className="grid gap-5">
                {application.answers.map((answer) => <div className="border-b border-harbor/10 pb-5 last:border-0 last:pb-0" key={answer.id}><dt className="text-sm font-semibold text-depth">{answer.label}</dt><dd className="mb-0 mt-2 whitespace-pre-wrap text-sm leading-6 text-aura-text-secondary">{renderAnswerValue(answer)}</dd></div>)}
              </dl>
            </Card>
          </div>

          <div className="grid content-start gap-4">
            <Card className="p-5 md:p-6">
              <SectionHeading title="Skills" />
              <div className="flex flex-wrap gap-2">{candidate.skills.map((skill) => <span className="rounded-full border border-marine/15 bg-glacier/15 px-2.5 py-1 text-xs font-semibold text-harbor" key={skill}>{skill}</span>)}</div>
            </Card>

            <Card className="p-5 md:p-6">
              <SectionHeading title="Documents" />
              {application.documents.length ? <div className="grid gap-3">{application.documents.map((document) => <div className="rounded-aura-sm border border-harbor/10 bg-frost/55 p-3" key={document.id}><div className="flex items-start gap-3"><span className="inline-grid size-9 flex-none place-items-center rounded-aura-sm bg-white text-marine shadow-aura-xs"><FileText size={17} aria-hidden="true" /></span><div className="min-w-0"><p className="m-0 text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">{document.documentType}</p><p className="mb-0 mt-1 truncate text-sm font-semibold text-depth">{document.fileName}</p></div></div><Button className="mt-3 h-9 w-full" variant="secondary" onClick={() => setPreviewMessageFor(document.id)}>View document</Button>{previewMessageFor === document.id ? <p className="mb-0 mt-2 text-xs leading-5 text-aura-text-muted" role="status">Document preview is not available in this workspace.</p> : null}</div>)}</div> : <p className="m-0 text-sm text-aura-text-secondary">No documents were submitted.</p>}
            </Card>

            <Card className="p-5 md:p-6">
              <SectionHeading title="Application metadata" />
              <dl className="grid gap-3 text-sm">
                <div><dt className="text-xs text-aura-text-muted">Application ID</dt><dd className="mb-0 mt-1 break-all font-mono text-xs text-aura-text-secondary">{application.id}</dd></div>
                <div><dt className="text-xs text-aura-text-muted">Submitted</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatDateTime(application.submittedAt)}</dd></div>
                <div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-aura-text-muted">Status</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatApplicationStatus(application.status)}</dd></div><div><dt className="text-xs text-aura-text-muted">Current stage</dt><dd className="mb-0 mt-1 font-medium text-depth">{formatApplicationStage(application.currentStage)}</dd></div></div>
                <div><dt className="text-xs text-aura-text-muted">Job title</dt><dd className="mb-0 mt-1 font-medium text-depth">{job.title}</dd></div>
                <div><dt className="text-xs text-aura-text-muted">Application form version</dt><dd className="mb-0 mt-1 font-medium text-depth">{formVersion ? `Version ${formVersion}` : 'Not available'}</dd></div>
              </dl>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === 'timeline' ? <Card className="p-5 md:p-6"><SectionHeading title="Activity timeline" description="Recorded milestones for this application, shown in chronological order." /><CandidateTimeline events={timeline} /></Card> : null}
      {activeTab === 'screening' ? <CandidateScreeningPanel applicationId={application.id} /> : null}
      {activeTab === 'interview' ? <div className="grid gap-4"><CandidateInterviewPanel applicationId={application.id} />{interview && ['READY', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'].includes(sessionStatus) ? <Card className="p-5"><h2 className="m-0 text-lg font-semibold text-depth">Live interview session</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{sessionStatus === 'READY' ? 'Ready for session' : sessionStatus === 'IN_PROGRESS' ? 'Interview in progress' : sessionStatus === 'PAUSED' ? 'Interview paused' : session?.completionSummary ?? 'Interview completed'}</p>{sessionProgress ? <p className="mb-0 mt-1 text-xs text-aura-text-muted">{sessionProgress.asked} asked · {sessionProgress.skipped} skipped · {sessionProgress.notReached} not reached</p> : null}<Link className={`${backLinkClass} mt-4`} to={`/interviews/${interview.id}/session`}>{sessionStatus === 'READY' ? 'Open session' : sessionStatus === 'COMPLETED' ? 'View session summary' : 'Return to session'}</Link></Card> : null}</div> : null}
      {activeTab === 'final' ? <Placeholder title="Final evaluation" description="Final candidate evaluation will appear after interview review." /> : null}
    </PageContainer>
  )
}

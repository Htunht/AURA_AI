import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectHiringWorkflowReadiness } from '../../store/demoSelectors'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function HiringWorkflowReviewStep({ jobId }: { jobId: string }) {
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const job = state.jobs.find((item) => item.id === jobId)
  const form = state.applicationForms.find((item) => item.jobId === jobId && item.status === 'DRAFT') ?? state.applicationForms.find((item) => item.jobId === jobId && item.status === 'PUBLISHED')
  const rubric = state.rubrics.find((item) => item.jobId === jobId && item.status === 'DRAFT') ?? state.rubrics.find((item) => item.jobId === jobId && item.status === 'PUBLISHED')
  const readiness = selectHiringWorkflowReadiness(state, jobId)
  if (!job) return null
  const published = form?.status === 'PUBLISHED' && rubric?.status === 'PUBLISHED'
  function publish() {
    if (!form || !rubric || !readiness.ready || published) return
    dispatch({ type: 'PUBLISH_HIRING_WORKFLOW', payload: { jobId, formId: form.id, rubricId: rubric.id, publishedAt: new Date().toISOString() } })
    navigate(`/jobs/${jobId}`)
  }
  const checks = [['Job requirements complete', readiness.requirementsReady], ['Core application fields included', readiness.formReady], ['All required qualifications collect evidence', readiness.formReady], ['Screening weights total 100%', readiness.screeningReady], ['Automatic screening ready', readiness.ready], ['Public application preview valid', readiness.previewReady]] as const
  return <div className="grid gap-4"><div className="grid items-stretch gap-4 lg:grid-cols-2"><Card className="flex h-full flex-col p-5"><h2 className="m-0 text-lg font-semibold text-depth">Review the hiring workflow</h2><div className="mt-5 grid gap-3">{checks.map(([label, ready]) => <div className="flex items-center gap-3" key={label}>{ready ? <CheckCircle2 className="text-aura-success" size={18} /> : <AlertCircle className="text-aura-danger" size={18} />}<span className="text-sm font-semibold text-depth">{label}</span></div>)}</div></Card><Card className="flex h-full flex-col p-5"><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Candidate experience</p><h3 className="mb-0 mt-2 text-lg font-semibold text-depth">{form?.name ?? job.title}</h3><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Candidates see only the published questions and help text. Screening purposes remain private.</p><div className="mt-5 grid gap-2"><p className="m-0 rounded-aura-sm bg-frost/70 px-3 py-2 text-sm font-semibold text-depth">{job.requiredSkills.filter((item) => item.priority === 'REQUIRED').length} required skills · {job.minimumExperienceYears} years minimum</p><p className="m-0 rounded-aura-sm bg-frost/70 px-3 py-2 text-sm font-semibold text-depth">{form?.fields.length ?? 0} candidate questions</p><p className="m-0 rounded-aura-sm bg-frost/70 px-3 py-2 text-sm font-semibold text-depth">{rubric?.criteria.length ?? 0} weighted categories</p></div>{published ? <div className="mt-5 rounded-aura-sm bg-aura-success-soft p-4"><p className="m-0 text-sm font-semibold text-aura-success">Hiring workflow published</p><p className="mb-0 mt-1 text-xs text-aura-text-secondary">Automatic screening ready</p></div> : null}<div className="mt-auto grid gap-2 pt-5"><Button disabled={!readiness.ready || published} onClick={publish}>{published ? 'Hiring workflow published' : 'Publish hiring workflow'}</Button><Button variant="secondary" onClick={() => navigate(`/jobs/${jobId}/setup?step=screening`)}>Back</Button>{published && job.status === 'OPEN' ? <Link className="inline-flex h-10 items-center justify-center gap-2 text-sm font-semibold text-harbor no-underline" to={`/apply/${jobId}`}><ExternalLink size={16} />Open public application</Link> : null}</div></Card></div>{readiness.blockingIssues.length ? <Card className="border-aura-danger/25 p-5"><h3 className="m-0 text-sm font-semibold text-aura-danger">Resolve before publishing</h3><ul className="mb-0 mt-3 grid gap-1 pl-5 text-sm text-aura-text-secondary">{readiness.blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></Card> : null}{readiness.warnings.length ? <Card className="border-aura-warning/25 p-5"><h3 className="m-0 text-sm font-semibold text-aura-warning">Review notes</h3><ul className="mb-0 mt-3 grid gap-1 pl-5 text-sm text-aura-text-secondary">{readiness.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></Card> : null}</div>
}

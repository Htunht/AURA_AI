import { Check } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ApplicationFormStep } from '../components/forms/ApplicationFormStep'
import { HiringWorkflowReviewStep } from '../components/jobs/HiringWorkflowReviewStep'
import { JobRequirementsStep } from '../components/jobs/JobRequirementsStep'
import { PageContainer } from '../components/layout/PageContainer'
import { ScreeningRulesStep } from '../components/screening/ScreeningRulesStep'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectHiringWorkflowSetupProgress } from '../store/demoSelectors'
import type { HiringWorkflowSetupStep } from '../types/hiringWorkflowSetup'
import { useParams } from 'react-router-dom'

const steps: Array<{ id: HiringWorkflowSetupStep; query: string; label: string; description: string }> = [
  { id: 'REQUIREMENTS', query: 'requirements', label: 'Job requirements', description: 'Define what the role needs.' },
  { id: 'APPLICATION_FORM', query: 'form', label: 'Application form', description: 'Collect candidate evidence.' },
  { id: 'SCREENING_RULES', query: 'screening', label: 'Screening rules', description: 'Review how evidence is evaluated.' },
  { id: 'REVIEW', query: 'review', label: 'Review and publish', description: 'Publish one complete workflow.' },
]

export default function HiringWorkflowSetup() {
  const { jobId = '' } = useParams()
  const { state } = useDemoStore()
  const [params, setParams] = useSearchParams()
  const job = state.jobs.find((item) => item.id === jobId)
  const progress = selectHiringWorkflowSetupProgress(state, jobId)
  if (!job) return <PageContainer eyebrow="Hiring workflow" title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening could not be resolved.</Card></PageContainer>
  const requested = params.get('step')
  const active = steps.find((item) => item.query === requested) ?? steps.find((item) => item.id === progress.currentStep) ?? steps[0]!
  return <PageContainer eyebrow="Hiring workflow" title={`Set up ${job.title}`} description="Define the role, collect the right candidate evidence, and prepare automatic screening."><ol className="mb-5 grid gap-2 p-0 md:grid-cols-4" aria-label="Hiring workflow setup progress">{steps.map((step, index) => { const complete = progress.completedSteps.includes(step.id); const current = active.id === step.id; return <li key={step.id}><button type="button" className={`flex h-full w-full items-start gap-3 rounded-aura-sm border p-3 text-left ${current ? 'border-marine bg-glacier/15' : complete ? 'border-aura-success/25 bg-white' : 'border-harbor/10 bg-white/65'}`} onClick={() => setParams({ step: step.query })} aria-current={current ? 'step' : undefined}><span className={`inline-grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${complete ? 'bg-aura-success text-white' : current ? 'bg-harbor text-frost' : 'bg-frost text-aura-text-muted'}`}>{complete ? <Check size={14} /> : index + 1}</span><span><strong className="block text-sm text-depth">{step.label}</strong><small className="mt-1 block leading-4 text-aura-text-muted">{step.description}</small></span></button></li> })}</ol>{active.id === 'REQUIREMENTS' ? <JobRequirementsStep jobId={jobId} /> : active.id === 'APPLICATION_FORM' ? <ApplicationFormStep jobId={jobId} /> : active.id === 'SCREENING_RULES' ? <ScreeningRulesStep jobId={jobId} /> : <HiringWorkflowReviewStep jobId={jobId} />}</PageContainer>
}

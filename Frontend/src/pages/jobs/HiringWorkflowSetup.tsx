import { useSearchParams } from 'react-router-dom'
import { ApplicationFormStep } from '../../components/forms/ApplicationFormStep'
import { HiringWorkflowReviewStep } from '../../components/jobs/HiringWorkflowReviewStep'
import { JobRequirementsStep } from '../../components/jobs/JobRequirementsStep'
import { PageContainer } from '../../components/layout/PageContainer'
import { ScreeningRulesStep } from '../../components/screening/ScreeningRulesStep'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import { selectHiringWorkflowSetupProgress } from '../../store/demoSelectors'
import type { HiringWorkflowSetupStep } from '../../types/hiringWorkflowSetup'
import { useParams } from 'react-router-dom'

const steps: Array<{ id: HiringWorkflowSetupStep; query: string; label: string; description: string }> = [
  { id: 'REQUIREMENTS', query: 'requirements', label: 'Role', description: 'Define what the role needs.' },
  { id: 'APPLICATION_FORM', query: 'form', label: 'Application form', description: 'Collect candidate evidence.' },
  { id: 'SCREENING_RULES', query: 'screening', label: 'Screening criteria', description: 'Review how evidence is evaluated.' },
  { id: 'REVIEW', query: 'review', label: 'Review & publish', description: 'Publish one complete workflow.' },
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
  const chevronDepth = '18px'
  return <PageContainer eyebrow="" title={`Set up ${job.title}`}><div className="-mx-5 mb-6 overflow-x-auto border-b border-harbor/10 bg-frost px-5 py-5 md:-mx-8 md:px-8 xl:-mx-10 xl:px-10 animate-fade-in"><ol className="flex min-w-[760px] overflow-visible drop-shadow-[0_10px_24px_rgba(30,32,34,0.08)]" aria-label="Hiring workflow setup progress">{steps.map((step, index) => { const complete = progress.completedSteps.includes(step.id); const current = active.id === step.id; const clipPath = `polygon(0 0, calc(100% - ${chevronDepth}) 0, 100% 50%, calc(100% - ${chevronDepth}) 100%, 0 100%, ${chevronDepth} 50%)`; return <li key={step.id} className={`relative flex h-11 flex-1 items-center justify-center px-8 text-center ${index > 0 ? '-ml-3' : ''}`} style={{ clipPath, zIndex: steps.length - index }}><span className="pointer-events-none absolute inset-0 bg-harbor/15" style={{ clipPath }} aria-hidden="true" /><span className={`pointer-events-none absolute inset-[1px] ${complete ? 'bg-[#9FEA30]' : current ? 'bg-glacier' : 'bg-[#F7F8F4]'}`} style={{ clipPath }} aria-hidden="true" /><button type="button" className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0" onClick={() => setParams({ step: step.query })} aria-current={current ? 'step' : undefined} aria-label={`Step ${index + 1}: ${step.label}`}><span className="sr-only">{step.label}</span></button><span className={`pointer-events-none relative z-20 text-xs font-bold uppercase tracking-[0.12em] ${current || complete ? 'text-depth' : 'text-aura-text-muted'}`}><span className="sr-only">Step {index + 1}: </span>{step.label}</span></li> })}</ol></div>{active.id === 'REQUIREMENTS' ? <JobRequirementsStep jobId={jobId} /> : active.id === 'APPLICATION_FORM' ? <ApplicationFormStep jobId={jobId} /> : active.id === 'SCREENING_RULES' ? <ScreeningRulesStep jobId={jobId} /> : <HiringWorkflowReviewStep jobId={jobId} />}</PageContainer>
}

import { Check, Circle } from 'lucide-react'
import type { ApplicationStage } from '../../types/application'
import { getRecruitmentProgress } from '../../utils/candidateDetailPresentation'

export function CandidateRecruitmentProgress({ stage, embedded = false }: { stage: ApplicationStage; embedded?: boolean }) {
  const steps = getRecruitmentProgress(stage)

  return (
    <nav className={`${embedded ? 'border-t border-harbor/10 px-5 py-3 md:px-6' : 'mb-4 rounded-aura-md bg-white px-4 py-3 shadow-aura-xs'} overflow-x-auto`} aria-label="Recruitment progress">
      <ol className="flex min-w-[620px] items-center">
        {steps.map((step, index) => (
          <li className="flex flex-1 items-center last:flex-none" key={step.id}>
            <div className={`flex items-center gap-2 text-xs font-semibold ${step.state === 'CURRENT' ? 'text-depth' : step.state === 'COMPLETED' ? 'text-aura-success' : 'text-aura-text-muted'}`} aria-current={step.state === 'CURRENT' ? 'step' : undefined}>
              <span className={`inline-grid size-5 flex-none place-items-center rounded-full border ${step.state === 'CURRENT' ? 'border-marine bg-marine text-white' : step.state === 'COMPLETED' ? 'border-aura-success bg-aura-success-soft text-aura-success' : 'border-aura-border-strong bg-white text-aura-text-muted'}`}>
                {step.state === 'COMPLETED' ? <Check size={13} aria-hidden="true" /> : <Circle size={8} fill={step.state === 'CURRENT' ? 'currentColor' : 'none'} aria-hidden="true" />}
              </span>
              <span>{step.label}</span>
              <span className="sr-only">{step.state.toLocaleLowerCase()}</span>
            </div>
            {index < steps.length - 1 ? <span className={`mx-3 h-px min-w-5 flex-1 ${step.state === 'COMPLETED' ? 'bg-aura-success/35' : 'bg-harbor/15'}`} aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}

import { Check, Circle, TriangleAlert } from 'lucide-react'
import type { SchedulingProgressStep } from '../../store/demoSelectors'

const statusClasses: Record<SchedulingProgressStep['status'], string> = {
  COMPLETE: 'border-marine/25 bg-glacier/15 text-harbor',
  CURRENT: 'border-glacier bg-white text-harbor ring-2 ring-glacier/20',
  PENDING: 'border-harbor/15 bg-frost/60 text-aura-text-muted',
  FAILED: 'border-aura-warning/30 bg-aura-warning-soft text-aura-warning',
}

export function SchedulingProgress({ steps }: { steps: SchedulingProgressStep[] }) {
  return (
    <ol className="grid gap-2" aria-label="Interview scheduling progress">
      {steps.map((step) => (
        <li className="flex items-center gap-2.5 text-xs font-medium" key={step.id}>
          <span
            className={`inline-grid size-6 flex-none place-items-center rounded-full border ${statusClasses[step.status]}`}
            aria-hidden="true"
          >
            {step.status === 'COMPLETE' ? (
              <Check size={13} strokeWidth={2.5} />
            ) : step.status === 'FAILED' ? (
              <TriangleAlert size={12} />
            ) : (
              <Circle size={8} fill="currentColor" />
            )}
          </span>
          <span className={step.status === 'PENDING' ? 'text-aura-text-muted' : 'text-depth'}>
            {step.label}
          </span>
          <span className="sr-only">{step.status.toLowerCase()}</span>
        </li>
      ))}
    </ol>
  )
}

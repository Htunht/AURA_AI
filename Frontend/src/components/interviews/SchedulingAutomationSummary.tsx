import { CheckCircle2 } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

type SchedulingAutomationSummaryProps = {
  readyToShareCount: number
  scheduledCount: number
  exceptionCount: number
  preparingCount?: number
}

export function SchedulingAutomationSummary({
  readyToShareCount,
  scheduledCount,
  exceptionCount,
  preparingCount = 0,
}: SchedulingAutomationSummaryProps) {
  return (
    <Card className="mb-7 overflow-hidden border-marine/15">
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-grid size-10 flex-none place-items-center rounded-aura-sm bg-glacier/20 text-marine">
            <CheckCircle2 size={19} aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-base font-semibold text-depth">AURA scheduling automation</h2>
              <Badge tone="accent">AURA completed</Badge>
            </div>
            <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-aura-text-secondary">
              AURA applied interview policies, assigned interviewers, and generated candidate-ready time slots.
            </p>
            <p className="mb-0 mt-1 text-xs font-medium text-aura-text-muted">
              {preparingCount > 0
                ? 'AURA is preparing interview availability for shortlisted candidates.'
                : 'All eligible candidates have a scheduling invitation or confirmed interview.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-aura-sm bg-harbor/10 text-center">
          <SummaryValue label="Ready to share" value={readyToShareCount} />
          <SummaryValue label="Scheduled" value={scheduledCount} />
          <SummaryValue label="Need attention" value={exceptionCount} warning={exceptionCount > 0} />
        </div>
      </div>
    </Card>
  )
}

function SummaryValue({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className="min-w-24 bg-frost px-3 py-3">
      <p className={`m-0 text-xl font-bold ${warning ? 'text-aura-warning' : 'text-depth'}`}>{value}</p>
      <p className="mb-0 mt-1 text-[9px] font-bold uppercase tracking-wide text-aura-text-muted">{label}</p>
    </div>
  )
}

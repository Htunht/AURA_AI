import { Activity } from 'lucide-react'
import { Card } from '../ui/Card'

type SchedulingAutomationSummaryProps = {
  sendingCount: number
  awaitingCount: number
  scheduledCount: number
  exceptionCount: number
  preparingCount?: number
}

export function SchedulingAutomationSummary({ sendingCount, awaitingCount, scheduledCount, exceptionCount, preparingCount = 0 }: SchedulingAutomationSummaryProps) {
  const metrics = [
    { label: 'Need attention', value: exceptionCount, warning: exceptionCount > 0 },
    { label: 'In progress', value: sendingCount + preparingCount },
    { label: 'Awaiting response', value: awaitingCount },
    { label: 'Scheduled', value: scheduledCount },
  ]
  return <Card className="mb-5 p-3.5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2.5"><span className="inline-grid size-8 place-items-center rounded-aura-sm bg-glacier/20 text-marine"><Activity size={16} aria-hidden="true" /></span><div><p className="m-0 text-sm font-semibold text-depth">Scheduling overview</p><p className="mb-0 mt-0.5 text-xs text-aura-text-muted">AURA handles routine scheduling. Review only what needs action.</p></div></div><div className="flex flex-wrap gap-2">{metrics.map((metric) => <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${metric.warning ? 'border-aura-warning/25 bg-aura-warning-soft text-aura-warning' : 'border-harbor/10 bg-frost text-harbor'}`} key={metric.label}><strong className="text-sm">{metric.value}</strong>{metric.label}</span>)}</div></div></Card>
}

import { Clock3 } from 'lucide-react'

export function InterviewSessionTimer({ formattedElapsed, elapsedSeconds, scheduledMinutes }: { formattedElapsed: string; elapsedSeconds: number; scheduledMinutes: number }) {
  const overtime = elapsedSeconds > scheduledMinutes * 60
  return <div className={`rounded-aura-sm border p-3 ${overtime ? 'border-aura-warning/30 bg-aura-warning-soft/40' : 'border-harbor/15 bg-frost/60'}`}><div className="flex items-center gap-2"><Clock3 size={15} className="text-marine" /><span className="text-xs font-semibold text-aura-text-muted">Elapsed interview time</span></div><p className="mb-0 mt-1 font-mono text-2xl font-bold tracking-tight text-depth" aria-live="off">{formattedElapsed}</p><p className="mb-0 mt-1 text-xs text-aura-text-muted">Scheduled duration: {scheduledMinutes} minutes</p>{overtime ? <p className="mb-0 mt-2 text-xs font-semibold text-aura-warning">Interview is running beyond the scheduled duration.</p> : null}</div>
}

import { Clock3 } from 'lucide-react'

export function InterviewSessionTimer({ formattedElapsed }: { formattedElapsed: string }) {
  return <div className="rounded-aura-sm border border-harbor/15 bg-frost/60 p-3"><div className="flex items-center gap-2"><Clock3 size={15} className="text-marine" /><span className="text-xs font-semibold text-aura-text-muted">Elapsed interview time</span></div><p className="mb-0 mt-1 font-mono text-2xl font-bold tracking-tight text-depth" aria-live="off">{formattedElapsed}</p></div>
}

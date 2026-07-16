import type { ResolvedInterviewSchedulingPolicy } from '../../types/resolvedInterviewSchedulingPolicy'
import { Badge } from '../ui/Badge'

export function SchedulingPolicySource({ resolved, sourceLabel, compact = false }: { resolved?: ResolvedInterviewSchedulingPolicy; sourceLabel?: string; compact?: boolean }) {
  if (!resolved && !sourceLabel) {
    return <div><p className="m-0 text-sm font-semibold text-aura-warning">Scheduling defaults unavailable</p>{compact ? null : <p className="mb-0 mt-1 text-xs text-aura-text-muted">Set up an organization default or department template.</p>}</div>
  }
  const label = resolved?.sourceLabel ?? sourceLabel!
  const custom = resolved?.source === 'JOB_OVERRIDE' || label === 'Custom policy for this job'
  return <div className="flex flex-wrap items-center gap-2"><p className="m-0 text-sm font-semibold text-depth">{custom ? label : `Using ${label.toLocaleLowerCase()}`}</p><Badge tone={custom ? 'accent' : 'neutral'}>{custom ? 'Custom' : 'Inherited'}</Badge></div>
}

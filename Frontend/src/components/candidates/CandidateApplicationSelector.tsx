import type { CandidateApplicationItem } from '../../store/demoSelectors'
import { formatApplicationStage, formatDate } from '../../utils/helpers'

type CandidateApplicationSelectorProps = {
  applications: CandidateApplicationItem[]
  selectedApplicationId: string
  onChange: (applicationId: string) => void
}

export function CandidateApplicationSelector({
  applications,
  selectedApplicationId,
  onChange,
}: CandidateApplicationSelectorProps) {
  if (applications.length < 2) return null

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted">Application context</p>
      </div>
      <label className="grid gap-1 sm:min-w-96">
        <span className="sr-only">Select an application</span>
        <select
          className="h-9 rounded-aura-sm border border-harbor/15 bg-white px-3 text-xs font-medium text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35"
          value={selectedApplicationId}
          onChange={(event) => onChange(event.target.value)}
        >
          {applications.map((item) => (
            <option key={item.application.id} value={item.application.id}>
              {item.job.title} · {formatDate(item.application.submittedAt)} · {formatApplicationStage(item.application.currentStage)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

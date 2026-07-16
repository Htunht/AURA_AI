import type { Interviewer } from '../../types/interviewer'

export function InterviewerSelector({
  interviewers,
  selectedIds,
  onChange,
}: {
  interviewers: Interviewer[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-depth">Interviewers</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {interviewers.map((person) => {
          const selected = selectedIds.includes(person.id)
          return (
            <label className={`flex cursor-pointer items-start gap-3 rounded-aura-sm border p-3 transition-colors focus-within:ring-2 focus-within:ring-glacier ${selected ? 'border-marine/40 bg-glacier/15' : 'border-harbor/15 bg-white hover:bg-frost/60'}`} key={person.id}>
              <input type="checkbox" className="mt-1 size-4 accent-harbor" checked={selected} onChange={() => onChange(selected ? selectedIds.filter((id) => id !== person.id) : [...selectedIds, person.id])} />
              <span><strong className="block text-sm font-semibold text-depth">{person.fullName}</strong><span className="mt-1 block text-xs text-aura-text-secondary">{person.roleTitle}</span><span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-aura-text-muted">{person.department}</span></span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

import type { InterviewSlot } from '../../types/interviewSchedulingInvitation'
import { formatInterviewDate, formatInterviewTime } from '../../utils/helpers'

export function CandidateSlotPicker({
  slots,
  selectedSlotId,
  onChange,
}: {
  slots: InterviewSlot[]
  selectedSlotId: string
  onChange: (slotId: string) => void
}) {
  const groups = slots.reduce<Array<{ date: string; slots: InterviewSlot[] }>>((result, slot) => {
    const date = slot.start.slice(0, 10)
    const group = result.find((item) => item.date === date)
    if (group) group.slots.push(slot)
    else result.push({ date, slots: [slot] })
    return result
  }, [])
  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <fieldset className="m-0 border-0 p-0" key={group.date}>
          <legend className="mb-3 text-sm font-semibold text-depth">{formatInterviewDate(group.slots[0]!.start)}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.slots.map((slot) => (
              <label className={`cursor-pointer rounded-aura-sm border p-4 transition-colors focus-within:ring-2 focus-within:ring-glacier ${selectedSlotId === slot.id ? 'border-marine bg-glacier/15' : 'border-harbor/15 bg-white hover:border-marine/40'}`} key={slot.id}>
                <span className="flex items-start gap-3">
                  <input className="mt-1 accent-harbor" type="radio" name="interview-slot" value={slot.id} checked={selectedSlotId === slot.id} onChange={() => onChange(slot.id)} />
                  <span><span className="block text-base font-semibold text-depth">{formatInterviewTime(slot.start)}–{formatInterviewTime(slot.end)}</span><span className="mt-1 block text-xs text-aura-text-muted">{slot.timezone}</span></span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}

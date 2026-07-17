import type { Interview } from '../types/interview'
import type { InterviewSlot } from '../types/interviewSchedulingInvitation'
import type { Interviewer, InterviewerWorkingHours } from '../types/interviewer'
import type { InterviewSchedulingPolicy, InterviewSchedulingWorkingDay } from '../types/interviewSchedulingPolicy'

export type InterviewSlotGenerationResult = { slots: InterviewSlot[]; errors: string[] }

const dayNames: InterviewSchedulingWorkingDay[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
const workingHoursKeys: Array<keyof InterviewerWorkingHours> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function minutes(value: string) {
  const [hours = 0, mins = 0] = value.split(':').map(Number)
  return hours * 60 + mins
}

function isoAt(date: Date, minuteOfDay: number) {
  return new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
    Math.floor(minuteOfDay / 60), minuteOfDay % 60,
  )).toISOString()
}

function worksDuring(person: Interviewer, dayIndex: number, startMinute: number, endMinute: number) {
  const ranges = person.workingHours[workingHoursKeys[dayIndex]!]
  return ranges?.some((range) => startMinute >= minutes(range.startTime) && endMinute <= minutes(range.endTime)) ?? false
}

export function generateInterviewSlots(input: {
  policy: InterviewSchedulingPolicy
  interviewerIds: string[]
  interviewers: Interviewer[]
  existingInterviews: Interview[]
  now: Date
}): InterviewSlotGenerationResult {
  const assigned = input.interviewerIds
    .map((id) => input.interviewers.find((person) => person.id === id && person.isActive))
    .filter((person): person is Interviewer => Boolean(person))
  if (assigned.length !== input.interviewerIds.length) return { slots: [], errors: ['Assigned interviewer availability could not be resolved.'] }
  const slots: InterviewSlot[] = []
  const base = new Date(Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), input.now.getUTCDate()))
  const minimumStart = input.now.getTime() + input.policy.minimumNoticeHours * 3_600_000
  for (let offset = input.policy.schedulingWindowStartDays; offset <= input.policy.schedulingWindowEndDays; offset += 1) {
    const date = new Date(base.getTime() + offset * 86_400_000)
    const dayIndex = date.getUTCDay()
    if (!input.policy.workingDays.includes(dayNames[dayIndex]!)) continue
    const dailyStart = minutes(input.policy.dailyStartTime)
    const dailyEnd = minutes(input.policy.dailyEndTime)
    for (let startMinute = dailyStart; startMinute + input.policy.durationMinutes <= dailyEnd; startMinute += input.policy.slotIntervalMinutes) {
      const endMinute = startMinute + input.policy.durationMinutes
      if (!assigned.every((person) => worksDuring(person, dayIndex, startMinute, endMinute))) continue
      const start = isoAt(date, startMinute)
      const end = isoAt(date, endMinute)
      if (new Date(start).getTime() < minimumStart) continue
      const buffer = input.policy.bufferMinutes * 60_000
      const conflicts = input.existingInterviews.some((interview) =>
        (interview.status === 'SCHEDULED' || interview.status === 'IN_PROGRESS' || interview.status === 'PAUSED') &&
        interview.interviewers.some((person) => input.interviewerIds.includes(person.id)) &&
        new Date(start).getTime() - buffer < new Date(interview.scheduledEnd).getTime() &&
        new Date(end).getTime() + buffer > new Date(interview.scheduledStart).getTime(),
      )
      if (conflicts) continue
      const compactDate = start.slice(0, 10).replaceAll('-', '')
      const compactTime = start.slice(11, 16).replace(':', '')
      slots.push({
        id: `slot-${compactDate}-${compactTime}`,
        start,
        end,
        timezone: input.policy.workspaceTimezone,
        interviewerIds: [...input.interviewerIds],
      })
      if (slots.length >= input.policy.candidateSlotCount) return { slots, errors: [] }
    }
  }
  return slots.length
    ? { slots, errors: [] }
    : { slots: [], errors: ['No available slots satisfy the scheduling policy.'] }
}

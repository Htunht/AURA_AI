import type { Interview } from '../types/interview'
import type { Interviewer } from '../types/interviewer'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'

export type InterviewerAssignmentResult = { interviewerIds: string[]; errors: string[] }

function bookingCount(interviewerId: string, interviews: Interview[], start: string, end: string) {
  return interviews.filter((interview) =>
    (interview.status === 'SCHEDULED' || interview.status === 'IN_PROGRESS' || interview.status === 'PAUSED') &&
    interview.scheduledStart < end && interview.scheduledEnd > start &&
    interview.interviewers.some((person) => person.id === interviewerId),
  ).length
}

export function assignInterviewers(input: {
  policy: InterviewSchedulingPolicy
  interviewers: Interviewer[]
  interviews: Interview[]
  windowStart: string
  windowEnd: string
}): InterviewerAssignmentResult {
  const active = input.interviewers.filter((person) => person.isActive)
  const ordered = [...active].sort((left, right) =>
    bookingCount(left.id, input.interviews, input.windowStart, input.windowEnd) -
      bookingCount(right.id, input.interviews, input.windowStart, input.windowEnd) ||
    left.id.localeCompare(right.id),
  )
  let selected: Interviewer[] = []
  if (input.policy.interviewerSelectionStrategy === 'FIXED_INTERVIEWERS') {
    selected = input.policy.fixedInterviewerIds
      .map((id) => active.find((person) => person.id === id))
      .filter((person): person is Interviewer => Boolean(person))
  } else if (input.policy.interviewerSelectionStrategy === 'REQUIRED_ROLES') {
    for (const role of input.policy.requiredInterviewerRoles) {
      const match = ordered.find(
        (person) => person.roleTitle === role && !selected.some((item) => item.id === person.id),
      )
      if (match) selected.push(match)
    }
    for (const person of ordered) {
      if (selected.length >= input.policy.interviewerCount) break
      if (!selected.some((item) => item.id === person.id)) selected.push(person)
    }
  } else {
    selected = ordered
  }
  selected = selected.slice(0, input.policy.interviewerCount)
  if (selected.length < input.policy.interviewerCount) {
    return { interviewerIds: [], errors: ['Not enough active interviewers satisfy this policy.'] }
  }
  if (
    input.policy.interviewerSelectionStrategy === 'REQUIRED_ROLES' &&
    input.policy.requiredInterviewerRoles.some(
      (role) => !selected.some((person) => person.roleTitle === role),
    )
  ) {
    return { interviewerIds: [], errors: ['Required interviewer role coverage is unavailable.'] }
  }
  return { interviewerIds: selected.map((person) => person.id), errors: [] }
}

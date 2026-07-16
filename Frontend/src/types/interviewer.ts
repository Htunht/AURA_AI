export type WorkingHoursRange = {
  startTime: string
  endTime: string
}

export type InterviewerWorkingHours = {
  monday?: WorkingHoursRange[]
  tuesday?: WorkingHoursRange[]
  wednesday?: WorkingHoursRange[]
  thursday?: WorkingHoursRange[]
  friday?: WorkingHoursRange[]
  saturday?: WorkingHoursRange[]
  sunday?: WorkingHoursRange[]
}

export type Interviewer = {
  id: string
  fullName: string
  roleTitle: string
  department: string
  email: string
  timezone: string
  workingHours: InterviewerWorkingHours
  isActive: boolean
}

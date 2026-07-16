import type { EmploymentType, WorkArrangement } from './job'

export type JobDraftInput = {
  title: string
  department: string
  description: string
  positionsCount: number
  employmentType: EmploymentType
  workArrangement: WorkArrangement
  location: string
  minimumExperienceYears: number
  requiredSkills: string[]
  preferredSkills: string[]
  applicationDeadline: string
}

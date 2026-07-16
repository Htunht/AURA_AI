export type JobStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED'

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACT'
  | 'INTERNSHIP'
  | 'TEMPORARY'

export type WorkArrangement = 'ONSITE' | 'HYBRID' | 'REMOTE'

export type SkillRequirement = {
  name: string
  priority: 'REQUIRED' | 'PREFERRED'
  minimumYears?: number
}

export type Job = {
  id: string
  title: string
  department: string
  description: string
  status: JobStatus
  positionsCount: number
  employmentType: EmploymentType
  workArrangement: WorkArrangement
  location?: string
  minimumExperienceYears: number
  applicationDeadline?: string
  requiredSkills: SkillRequirement[]
  createdAt: string
  updatedAt: string
  openedAt?: string
  closedAt?: string
  archivedAt?: string
}

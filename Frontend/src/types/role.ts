export type UserRole = 'INTERVIEWER' | 'RECRUITER' | 'HIRING_MANAGER' | 'ADMIN'

export type DemoUser = {
  id: string
  name: string
  role: UserRole
}

import type { DemoUser } from '../types/role'

const demoUser: DemoUser = { id: 'user-hiring-manager-001', name: 'Avery Morgan', role: 'HIRING_MANAGER' }

export function useAuth() {
  return { currentUser: demoUser }
}

export function resolveDemoWorkspaceMode(input: { dev: boolean; configuredMode?: string }) {
  const configuredMode = input.configuredMode?.trim().toLocaleLowerCase()
  if (configuredMode === 'backend') return false
  return input.dev || configuredMode === 'demo' || configuredMode === 'local'
}

export type WorkspaceMode = 'DEMO' | 'BACKEND'

export const demoWorkspaceMode = resolveDemoWorkspaceMode({
  dev: import.meta.env.DEV,
  configuredMode: import.meta.env.VITE_WORKSPACE_MODE,
})

export const workspaceMode: WorkspaceMode = demoWorkspaceMode ? 'DEMO' : 'BACKEND'
export const backendWorkspaceMode = workspaceMode === 'BACKEND'

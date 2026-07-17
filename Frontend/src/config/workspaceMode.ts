export function resolveDemoWorkspaceMode(input: { dev: boolean; configuredMode?: string }) {
  const configuredMode = input.configuredMode?.trim().toLocaleLowerCase()
  return input.dev || configuredMode === 'demo' || configuredMode === 'local'
}

export const demoWorkspaceMode = resolveDemoWorkspaceMode({
  dev: import.meta.env.DEV,
  configuredMode: import.meta.env.VITE_WORKSPACE_MODE,
})

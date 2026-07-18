import { useDemoStore } from '../../hooks/useDemoStore'
import { Button } from '../ui/Button'

export function Header() {
  const { resetDemoState } = useDemoStore()

  function handleReset() {
    if (
      window.confirm(
        'Reset workspace changes and restore the original AURA data?',
      )
    ) {
      resetDemoState()
    }
  }

  return (
    <header className="flex min-h-header items-center justify-between border-b border-harbor/15 bg-white px-5 py-3 md:px-8 xl:px-10">
      <div>
        <p className="m-0 text-[15px] font-bold tracking-[-0.01em] text-depth">
          AI Unified Recruitment Assistant
        </p>
        <p className="m-0 text-xs font-medium text-aura-text-muted">
          Hiring Workspace
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <Button variant="ghost" onClick={handleReset}>
          Reset Workspace Data
        </Button>
      </div>
    </header>
  )
}

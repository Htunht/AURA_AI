import type { ReactNode } from 'react'
import {
  ScreeningAutomationContext,
  useScreeningAutomationController,
} from '../hooks/useScreeningAutomation'

export function ScreeningAutomationProvider({
  children,
}: {
  children: ReactNode
}) {
  const controller = useScreeningAutomationController()

  return (
    <ScreeningAutomationContext.Provider value={controller}>
      {children}
    </ScreeningAutomationContext.Provider>
  )
}

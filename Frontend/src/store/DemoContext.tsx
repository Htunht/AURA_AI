import {
  useCallback,
  createContext,
  useEffect,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react'
import {
  demoReducer,
  initialDemoState,
  type DemoAction,
  type DemoState,
} from './demoReducer'
import {
  clearPersistedDemoState,
  loadPersistedDemoState,
  resolveSynchronizedDemoState,
  savePersistedDemoState,
} from './demoPersistence'

export type DemoContextValue = {
  state: DemoState
  dispatch: Dispatch<DemoAction>
  resetDemoState: () => void
}

// oxlint-disable-next-line react/only-export-components
export const DemoContext = createContext<DemoContextValue | undefined>(
  undefined,
)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    demoReducer,
    initialDemoState,
    () => {
      const hydration = loadPersistedDemoState()

      if (import.meta.env.DEV && hydration.errors.length > 0) {
        console.warn('AURA AI demo state hydration warnings:', hydration.errors)
      }

      return hydration.state
    },
  )
  const stateRef = useRef(state)
  const synchronizedStateRef = useRef<DemoState | undefined>(undefined)
  stateRef.current = state

  useEffect(() => {
    if (synchronizedStateRef.current === state) {
      synchronizedStateRef.current = undefined
      return
    }
    const result = savePersistedDemoState(state)

    if (import.meta.env.DEV && !result.success) {
      console.warn(result.error)
    }
  }, [state])

  useEffect(() => {
    function synchronizeFromStorage(event: StorageEvent) {
      const incoming = resolveSynchronizedDemoState(stateRef.current, event.key, event.newValue)
      if (!incoming) return
      synchronizedStateRef.current = incoming
      dispatch({ type: 'REPLACE_DEMO_STATE', payload: { state: incoming } })
    }

    window.addEventListener('storage', synchronizeFromStorage)
    return () => window.removeEventListener('storage', synchronizeFromStorage)
  }, [])

  const resetDemoState = useCallback(() => {
    const result = clearPersistedDemoState()

    if (import.meta.env.DEV && !result.success) {
      console.warn(result.error)
    }

    dispatch({ type: 'RESET_DEMO_STATE' })
  }, [])

  return (
    <DemoContext.Provider value={{ state, dispatch, resetDemoState }}>
      {children}
    </DemoContext.Provider>
  )
}

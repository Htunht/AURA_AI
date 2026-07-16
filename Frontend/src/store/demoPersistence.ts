import { validatePersistedDemoState } from '../utils/persistedDemoStateValidation'
import { createInitialDemoState } from './demoInitialState'
import type { DemoState } from './demoStateTypes'

export const DEMO_STORAGE_KEY = 'aura-ai-demo-state-v1'

export type PersistedDemoState = DemoState

export type DemoStateHydrationResult = {
  state: DemoState
  source: 'PERSISTED' | 'SEED'
  errors: string[]
}

export type DemoStatePersistenceResult = {
  success: boolean
  error?: string
}

const STORAGE_TEST_KEY = `${DEMO_STORAGE_KEY}-availability-test`

function canUseLocalStorage(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    window.localStorage.setItem(STORAGE_TEST_KEY, STORAGE_TEST_KEY)
    window.localStorage.removeItem(STORAGE_TEST_KEY)
    return true
  } catch {
    return false
  }
}

export function createFreshDemoState(): DemoState {
  return createInitialDemoState()
}

export function recoverInterruptedScreeningQueue(state: DemoState): DemoState {
  const hasInterruptedItems = state.screeningQueue.some(
    (item) => item.status === 'PROCESSING',
  )

  if (!hasInterruptedItems) return state

  return {
    ...state,
    screeningQueue: state.screeningQueue.map((item) =>
      item.status === 'PROCESSING'
        ? {
            ...item,
            status: 'QUEUED',
            startedAt: undefined,
          }
        : item,
    ),
  }
}

export function normalizePersistedDemoState(
  state: Omit<DemoState, 'screeningQueue'> & {
    screeningQueue?: DemoState['screeningQueue']
  },
): DemoState {
  return recoverInterruptedScreeningQueue({
    ...state,
    screeningQueue: Array.isArray(state.screeningQueue)
      ? state.screeningQueue
      : [],
  })
}

export function loadPersistedDemoState(): DemoStateHydrationResult {
  if (!canUseLocalStorage()) {
    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Demo persistence is unavailable in this browser environment.'],
    }
  }

  let storedValue: string | null

  try {
    storedValue = window.localStorage.getItem(DEMO_STORAGE_KEY)
  } catch {
    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Demo persistence is unavailable in this browser environment.'],
    }
  }

  if (storedValue === null) {
    return { state: createFreshDemoState(), source: 'SEED', errors: [] }
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(storedValue)
  } catch {
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
    } catch {
      // The invalid value is ignored even if this browser blocks its removal.
    }

    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Stored AURA AI demo state could not be parsed.'],
    }
  }

  const validation = validatePersistedDemoState(parsedValue)

  if (!validation.valid) {
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
    } catch {
      // The invalid value is ignored even if this browser blocks its removal.
    }

    return {
      state: createFreshDemoState(),
      source: 'SEED',
      errors: ['Stored AURA AI demo state is invalid.', ...validation.errors],
    }
  }

  return {
    state: normalizePersistedDemoState(
      parsedValue as Omit<PersistedDemoState, 'screeningQueue'> & {
        screeningQueue?: PersistedDemoState['screeningQueue']
      },
    ),
    source: 'PERSISTED',
    errors: [],
  }
}

export function savePersistedDemoState(
  state: DemoState,
): DemoStatePersistenceResult {
  if (!canUseLocalStorage()) {
    return {
      success: false,
      error: 'AURA AI demo state could not be saved.',
    }
  }

  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'AURA AI demo state could not be saved.',
    }
  }
}

export function clearPersistedDemoState(): DemoStatePersistenceResult {
  if (!canUseLocalStorage()) {
    return {
      success: false,
      error: 'AURA AI demo state could not be cleared.',
    }
  }

  try {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'AURA AI demo state could not be cleared.',
    }
  }
}

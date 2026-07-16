import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
} from 'react'
import { DemoServiceError, runCandidateScreening } from '../services'
import {
  findApplicationsRequiringAutomaticScreening,
  selectLatestScreeningEvaluation,
} from '../store/demoSelectors'
import type { DemoAction } from '../store/demoReducer'
import { useDemoStore } from './useDemoStore'

const MAX_CONCURRENT_SCREENINGS = 3

export type ScreeningAutomationController = {
  isRunning: boolean
  activeApplicationIds: string[]
  retryFailed: (applicationIds?: string[]) => void
}

export const ScreeningAutomationContext = createContext<
  ScreeningAutomationController | undefined
>(undefined)

function queueItemId(applicationId: string) {
  return `screening-queue-${applicationId}`
}

function readableScreeningError(error: unknown) {
  if (error instanceof DemoServiceError) {
    if (error.code === 'RUBRIC_NOT_FOUND') {
      return 'An evaluation rubric is not available for this role.'
    }
    if (error.code === 'INVALID_SERVICE_INPUT') {
      return 'The application does not contain enough evidence for screening.'
    }
    if (error.code === 'APPLICATION_NOT_FOUND') {
      return 'The candidate application could not be resolved.'
    }
  }

  return 'Screening could not be completed. Please retry.'
}

export function useScreeningAutomationController(): ScreeningAutomationController {
  const { state, dispatch } = useDemoStore()
  const stateRef = useRef(state)
  stateRef.current = state
  const mountedRef = useRef(false)
  const bootstrappedRef = useRef(false)
  const activeIdsRef = useRef(new Set<string>())
  const [activeApplicationIds, setActiveApplicationIds] = useState<string[]>([])

  const publishActiveIds = useCallback(() => {
    if (mountedRef.current) {
      setActiveApplicationIds([...activeIdsRef.current])
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true

    for (const applicationId of findApplicationsRequiringAutomaticScreening(
      stateRef.current,
    )) {
      const application = stateRef.current.applications.find(
        (item) => item.id === applicationId,
      )
      if (!application) continue
      dispatch({
        type: 'QUEUE_SCREENING_APPLICATION',
        payload: { applicationId, queuedAt: application.submittedAt },
      })
    }
  }, [dispatch])

  const processQueueItem = useCallback(
    async (applicationId: string, actionDispatch: Dispatch<DemoAction>) => {
      if (activeIdsRef.current.has(applicationId)) return
      activeIdsRef.current.add(applicationId)
      publishActiveIds()

      const id = queueItemId(applicationId)
      const startedAt = new Date().toISOString()

      try {
        const currentState = stateRef.current
        const queueItem = currentState.screeningQueue.find(
          (item) => item.id === id,
        )
        if (!queueItem || queueItem.status !== 'QUEUED') return

        const existingEvaluation = selectLatestScreeningEvaluation(
          currentState,
          applicationId,
        )
        actionDispatch({
          type: 'START_SCREENING_QUEUE_ITEM',
          payload: { queueItemId: id, startedAt },
        })

        if (existingEvaluation?.status === 'COMPLETED') {
          actionDispatch({
            type: 'COMPLETE_SCREENING_QUEUE_ITEM',
            payload: { queueItemId: id, completedAt: startedAt },
          })
          return
        }

        const application = currentState.applications.find(
          (item) => item.id === applicationId,
        )
        const candidate = application
          ? currentState.candidates.find(
              (item) => item.id === application.candidateId,
            )
          : undefined
        const job = application
          ? currentState.jobs.find((item) => item.id === application.jobId)
          : undefined
        const rubric = job
          ? currentState.rubrics.find((item) => item.jobId === job.id)
          : undefined

        if (!application || !candidate || !job || !rubric) {
          actionDispatch({
            type: 'FAIL_SCREENING_QUEUE_ITEM',
            payload: {
              queueItemId: id,
              completedAt: startedAt,
              error:
                'Candidate application, role, or evaluation rubric could not be resolved.',
            },
          })
          return
        }

        actionDispatch({
          type: 'UPDATE_APPLICATION_STAGE',
          payload: { applicationId, stage: 'AI_SCREENING' },
        })

        const result = await runCandidateScreening({
          applicationId,
          applications: currentState.applications,
          evaluations: currentState.evaluations,
          rubric,
        })

        if (!mountedRef.current) return
        const latestState = stateRef.current
        const latestQueueItem = latestState.screeningQueue.find(
          (item) => item.id === id,
        )
        if (!latestQueueItem || latestQueueItem.status !== 'PROCESSING') return

        if (
          selectLatestScreeningEvaluation(latestState, applicationId)
            ?.status !== 'COMPLETED'
        ) {
          actionDispatch({ type: 'ADD_EVALUATION', payload: result.evaluation })
        }
        actionDispatch({
          type: 'COMPLETE_SCREENING_QUEUE_ITEM',
          payload: {
            queueItemId: id,
            completedAt: new Date().toISOString(),
          },
        })
      } catch (error) {
        if (!mountedRef.current) return
        const queueItem = stateRef.current.screeningQueue.find(
          (item) => item.id === id,
        )
        if (queueItem?.status === 'PROCESSING') {
          actionDispatch({
            type: 'FAIL_SCREENING_QUEUE_ITEM',
            payload: {
              queueItemId: id,
              completedAt: new Date().toISOString(),
              error: readableScreeningError(error),
            },
          })
        }
      } finally {
        activeIdsRef.current.delete(applicationId)
        publishActiveIds()
      }
    },
    [publishActiveIds],
  )

  useEffect(() => {
    const availableSlots =
      MAX_CONCURRENT_SCREENINGS - activeIdsRef.current.size
    if (availableSlots <= 0) return

    const nextItems = state.screeningQueue
      .filter(
        (item) =>
          item.status === 'QUEUED' &&
          !activeIdsRef.current.has(item.applicationId),
      )
      .sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))
      .slice(0, availableSlots)

    for (const item of nextItems) {
      void processQueueItem(item.applicationId, dispatch)
    }
  }, [dispatch, processQueueItem, state.screeningQueue])

  const retryFailed = useCallback(
    (applicationIds?: string[]) => {
      const requestedIds = applicationIds ? new Set(applicationIds) : undefined
      const queuedAt = new Date().toISOString()

      for (const item of stateRef.current.screeningQueue) {
        if (
          item.status === 'FAILED' &&
          (!requestedIds || requestedIds.has(item.applicationId))
        ) {
          dispatch({
            type: 'RETRY_SCREENING_QUEUE_ITEM',
            payload: { queueItemId: item.id, queuedAt },
          })
        }
      }
    },
    [dispatch],
  )

  return {
    isRunning:
      activeApplicationIds.length > 0 ||
      state.screeningQueue.some((item) => item.status === 'PROCESSING'),
    activeApplicationIds,
    retryFailed,
  }
}

export function useScreeningAutomation(): ScreeningAutomationController {
  const context = useContext(ScreeningAutomationContext)
  if (!context) {
    throw new Error(
      'useScreeningAutomation must be used within ScreeningAutomationProvider',
    )
  }
  return context
}

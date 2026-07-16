import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { generateInterviewQuestions } from '../services/interviewQuestionGeneration'
import { deriveJobRequirements } from '../utils/jobRequirements'
import { createNextInterviewQuestionSetId } from '../utils/interviewQuestionIds'
import { useDemoStore } from './useDemoStore'

export type InterviewQuestionAutomationController = { retryPreparation: (interviewId: string) => void; regenerateQuestions: (interviewId: string) => void }
export const InterviewQuestionAutomationContext = createContext<InterviewQuestionAutomationController | undefined>(undefined)

export function useInterviewQuestionAutomationController(): InterviewQuestionAutomationController {
  const { state, dispatch } = useDemoStore()
  const stateRef = useRef(state)
  stateRef.current = state

  const prepare = useCallback((interviewId: string, regenerate = false) => {
    const current = stateRef.current
    const interview = current.interviews.find((item) => item.id === interviewId)
    const existing = current.interviewQuestionSets.filter((item) => item.interviewId === interviewId).sort((a, b) => b.version - a.version)[0]
    if (!interview || !['SCHEDULED', 'IN_PROGRESS'].includes(interview.status) || (!regenerate && existing)) return
    if (regenerate && (!existing || existing.status === 'APPROVED')) return
    const application = current.applications.find((item) => item.id === interview.applicationId)
    const candidate = application ? current.candidates.find((item) => item.id === application.candidateId) : undefined
    const job = application ? current.jobs.find((item) => item.id === application.jobId) : undefined
    const now = new Date().toISOString()
    const version = regenerate && existing ? existing.version + 1 : 1
    const id = createNextInterviewQuestionSetId(current.interviewQuestionSets, interview.id)
    if (!application || !candidate || !job) {
      const failed = { id, interviewId: interview.id, version, status: 'GENERATION_FAILED' as const, questions: [], generationError: 'Required candidate or role information is unavailable.', createdAt: now, updatedAt: now }
      dispatch(regenerate && existing ? { type: 'REGENERATE_INTERVIEW_QUESTION_SET', payload: { previousQuestionSetId: existing.id, questionSet: failed } } : { type: 'MARK_INTERVIEW_QUESTION_GENERATION_FAILED', payload: { questionSet: failed } })
      return
    }
    try {
      const durationMinutes = Math.round((Date.parse(interview.scheduledEnd) - Date.parse(interview.scheduledStart)) / 60_000)
      const result = generateInterviewQuestions({ interview, application, candidate, job, form: current.applicationForms.filter((item) => item.jobId === job.id && item.status === 'PUBLISHED').sort((a, b) => b.version - a.version)[0], screeningEvaluation: current.evaluations.filter((item) => item.applicationId === application.id && item.evaluationType === 'SCREENING' && item.status === 'COMPLETED').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0], requirements: deriveJobRequirements(job), durationMinutes })
      const questionSet = { id, interviewId: interview.id, version, status: 'DRAFT' as const, questions: result.questions, generatedAt: now, generationSummary: result.summary, createdAt: now, updatedAt: now }
      dispatch(regenerate && existing ? { type: 'REGENERATE_INTERVIEW_QUESTION_SET', payload: { previousQuestionSetId: existing.id, questionSet } } : { type: 'ADD_INTERVIEW_QUESTION_SET', payload: { questionSet } })
    } catch {
      const failed = { id, interviewId: interview.id, version, status: 'GENERATION_FAILED' as const, questions: [], generationError: 'AURA could not prepare an interview plan because required candidate or role information is unavailable.', createdAt: now, updatedAt: now }
      dispatch(regenerate && existing ? { type: 'REGENERATE_INTERVIEW_QUESTION_SET', payload: { previousQuestionSetId: existing.id, questionSet: failed } } : { type: 'MARK_INTERVIEW_QUESTION_GENERATION_FAILED', payload: { questionSet: failed } })
    }
  }, [dispatch])

  useEffect(() => {
    state.interviews.forEach((interview) => {
      if ((interview.status === 'SCHEDULED' || interview.status === 'IN_PROGRESS') && !state.interviewQuestionSets.some((set) => set.interviewId === interview.id)) prepare(interview.id)
    })
  }, [prepare, state.interviews, state.interviewQuestionSets])

  return { retryPreparation: (interviewId) => prepare(interviewId, true), regenerateQuestions: (interviewId) => prepare(interviewId, true) }
}

export function useInterviewQuestionAutomation() {
  const value = useContext(InterviewQuestionAutomationContext)
  if (!value) throw new Error('useInterviewQuestionAutomation must be used within InterviewQuestionAutomationProvider')
  return value
}

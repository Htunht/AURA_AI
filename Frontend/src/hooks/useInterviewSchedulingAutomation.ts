import interviewersData from '../data/interviewers.json'
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { prepareSchedulingInvitation } from '../services/interviewSchedulingAutomation'
import type { Interviewer } from '../types/interviewer'
import { useDemoStore } from './useDemoStore'
import { getEmailConfig } from '../config/emailConfig'
import { canRecoverPolicyMissingSchedulingException } from '../utils/interviewSchedulingPolicyResolution'
import { normalizeApplicationStage } from '../utils/applicationStage'

const interviewers = interviewersData as Interviewer[]

export type InterviewSchedulingAutomationController = {
  retryAutomation: (applicationId: string) => void
  regenerateInvitation: (invitationId: string) => void
}

export const InterviewSchedulingAutomationContext = createContext<
  InterviewSchedulingAutomationController | undefined
>(undefined)

export function useInterviewSchedulingAutomationController(): InterviewSchedulingAutomationController {
  const { state, dispatch } = useDemoStore()
  const stateRef = useRef(state)
  stateRef.current = state

  const prepare = useCallback((applicationId: string, invitationId?: string) => {
    const emailConfig = getEmailConfig()
    const result = prepareSchedulingInvitation({
      state: stateRef.current,
      applicationId,
      interviewers,
      now: new Date(),
      emailProvider: emailConfig.provider === 'emailjs' && emailConfig.emailJs ? 'EMAILJS' : 'DISABLED',
    })
    if (!result.invitation) return
    if (invitationId) {
      const { id: _id, applicationId: _applicationId, jobId: _jobId, createdAt: _createdAt, ...changes } = result.invitation
      dispatch({ type: 'UPDATE_SCHEDULING_INVITATION', payload: { invitationId, changes } })
    } else if (result.invitation.status === 'EXCEPTION_REQUIRED') {
      dispatch({ type: 'MARK_SCHEDULING_EXCEPTION', payload: { invitation: result.invitation } })
    } else {
      dispatch({ type: 'ADD_SCHEDULING_INVITATION', payload: { invitation: result.invitation } })
    }
  }, [dispatch])

  const retryAutomation = useCallback((applicationId: string) => {
    const existing = stateRef.current.interviewSchedulingInvitations.find(
      (item) => item.applicationId === applicationId && item.status === 'EXCEPTION_REQUIRED',
    )
    prepare(applicationId, existing?.id)
  }, [prepare])

  const regenerateInvitation = useCallback((invitationId: string) => {
    const invitation = stateRef.current.interviewSchedulingInvitations.find((item) => item.id === invitationId)
    if (invitation && invitation.status !== 'SCHEDULED') prepare(invitation.applicationId, invitation.id)
  }, [prepare])

  useEffect(() => {
    const now = new Date()
    for (const invitation of state.interviewSchedulingInvitations) {
      if (invitation.status === 'PENDING' && now >= new Date(invitation.expiresAt)) {
        dispatch({ type: 'EXPIRE_SCHEDULING_INVITATION', payload: { invitationId: invitation.id, updatedAt: now.toISOString() } })
      }
    }
    for (const invitation of state.interviewSchedulingInvitations) {
      if (canRecoverPolicyMissingSchedulingException({ policies: state.interviewSchedulingPolicies, jobs: state.jobs, invitation })) {
        prepare(invitation.applicationId, invitation.id)
      }
    }
    for (const application of state.applications) {
      const decision = state.decisions
        .filter((item) => item.applicationId === application.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
      const positive = decision?.humanRecommendation === 'STRONG_YES' || decision?.humanRecommendation === 'YES' || decision?.humanRecommendation === 'REVIEW'
      const hasActiveInterview = state.interviews.some((item) =>
        item.applicationId === application.id && (item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS' || item.status === 'PAUSED'),
      )
      const hasAutomationRecord = state.interviewSchedulingInvitations.some(
        (item) => item.applicationId === application.id &&
          ['PENDING', 'SCHEDULED', 'EXPIRED', 'CANCELLED', 'EXCEPTION_REQUIRED'].includes(item.status),
      )
      if (positive && normalizeApplicationStage(application.currentStage) === 'SHORTLISTED' && !hasActiveInterview && !hasAutomationRecord) {
        prepare(application.id)
      }
    }
  }, [dispatch, prepare, state])

  return { retryAutomation, regenerateInvitation }
}

export function useInterviewSchedulingAutomation() {
  const context = useContext(InterviewSchedulingAutomationContext)
  if (!context) throw new Error('useInterviewSchedulingAutomation must be used within InterviewSchedulingAutomationProvider')
  return context
}

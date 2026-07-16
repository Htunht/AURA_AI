import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { getEmailConfig } from '../config/emailConfig'
import { SchedulingEmailAutomationContext } from '../hooks/useSchedulingEmailAutomation'
import { buildSchedulingEmailInput } from '../services/email/buildSchedulingEmailInput'
import { createSchedulingEmailService } from '../services/email/createEmailService'
import type { SchedulingEmailService } from '../services/email/emailService'
import { useDemoStore } from '../hooks/useDemoStore'
import { canRecoverSchedulingEmail, isEmailJsConfigurationReady } from '../utils/schedulingEmailRecovery'

export const SCHEDULING_EMAIL_MINIMUM_INTERVAL_MS = 1000

export function SchedulingEmailAutomationProvider({ children, serviceOverride }: { children: ReactNode; serviceOverride?: SchedulingEmailService }) {
  const { state, dispatch } = useDemoStore()
  const config = useMemo(() => getEmailConfig(), [])
  const service = useMemo(() => serviceOverride ?? createSchedulingEmailService(config), [config, serviceOverride])
  const emailConfigured = isEmailJsConfigurationReady(config)
  const stateRef = useRef(state)
  const active = useRef(new Set<string>())
  const lastStartedAt = useRef(0)
  const mounted = useRef(true)
  stateRef.current = state

  useEffect(() => () => { mounted.current = false }, [])

  useEffect(() => {
    if (!emailConfigured || !state.interviewSchedulingInvitations.some(canRecoverSchedulingEmail)) return
    dispatch({
      type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION',
      payload: { queuedAt: new Date().toISOString() },
    })
  }, [dispatch, emailConfigured, state.interviewSchedulingInvitations])

  useEffect(() => {
    const invitation = state.interviewSchedulingInvitations.find((item) => item.status === 'PENDING' && item.delivery.status === 'QUEUED' && !active.current.has(item.id))
    if (!invitation) return
    const activeInvitations = active.current
    activeInvitations.add(invitation.id)
    const wait = Math.max(0, SCHEDULING_EMAIL_MINIMUM_INTERVAL_MS - (Date.now() - lastStartedAt.current))
    let started = false
    const timer = window.setTimeout(async () => {
      started = true
      if (!mounted.current) return
      const latest = stateRef.current.interviewSchedulingInvitations.find((item) => item.id === invitation.id)
      if (!latest || latest.status !== 'PENDING' || latest.delivery.status !== 'QUEUED') { activeInvitations.delete(invitation.id); return }
      const application = stateRef.current.applications.find((item) => item.id === latest.applicationId)
      const candidate = application ? stateRef.current.candidates.find((item) => item.id === application.candidateId) : undefined
      const job = stateRef.current.jobs.find((item) => item.id === latest.jobId)
      const startedAt = new Date().toISOString()
      dispatch({ type: 'START_SCHEDULING_EMAIL', payload: { invitationId: latest.id, startedAt } })
      lastStartedAt.current = Date.now()
      const result = application && candidate && job
        ? await service.sendSchedulingInvitation(buildSchedulingEmailInput({ invitation: latest, candidate, job, appPublicUrl: config.appPublicUrl }))
        : { success: false, provider: latest.delivery.provider, errorCode: 'UNKNOWN_EMAIL_ERROR' as const, errorMessage: 'The scheduling invitation email could not be sent.' }
      if (!mounted.current) return
      if (result.success) dispatch({ type: 'COMPLETE_SCHEDULING_EMAIL', payload: { invitationId: latest.id, sentAt: new Date().toISOString(), providerMessageId: result.providerMessageId } })
      else dispatch({ type: 'FAIL_SCHEDULING_EMAIL', payload: { invitationId: latest.id, failedAt: new Date().toISOString(), errorCode: result.errorCode ?? 'UNKNOWN_EMAIL_ERROR', errorMessage: result.errorMessage ?? 'The scheduling invitation email could not be sent.' } })
      activeInvitations.delete(invitation.id)
    }, wait)
    return () => {
      window.clearTimeout(timer)
      if (!started) activeInvitations.delete(invitation.id)
    }
  }, [config.appPublicUrl, dispatch, service, state])

  const retryEmail = useCallback((invitationId: string) => {
    const invitation = stateRef.current.interviewSchedulingInvitations.find((item) => item.id === invitationId)
    const queuedAt = new Date().toISOString()
    if (emailConfigured && invitation && canRecoverSchedulingEmail(invitation)) {
      dispatch({ type: 'RECOVER_SCHEDULING_EMAIL_CONFIGURATION', payload: { invitationId, queuedAt } })
      return
    }
    dispatch({ type: 'RETRY_SCHEDULING_EMAIL', payload: { invitationId, queuedAt } })
  }, [dispatch, emailConfigured])
  const retryAllFailed = useCallback(() => dispatch({ type: 'RETRY_FAILED_SCHEDULING_EMAILS', payload: { queuedAt: new Date().toISOString() } }), [dispatch])
  return <SchedulingEmailAutomationContext.Provider value={{ emailConfigured, retryEmail, retryAllFailed }}>{children}</SchedulingEmailAutomationContext.Provider>
}

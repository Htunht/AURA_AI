import type { EmailConfig } from '../config/emailConfig'
import type { InterviewSchedulingInvitation } from '../types/interviewSchedulingInvitation'

export function isEmailJsConfigurationReady(config: EmailConfig): boolean {
  return config.provider === 'emailjs' && Boolean(config.emailJs)
}

export function canRecoverSchedulingEmail(invitation: InterviewSchedulingInvitation): boolean {
  if (invitation.status !== 'PENDING' || invitation.delivery.status === 'SENT') return false

  return (
    invitation.delivery.provider === 'DISABLED' && invitation.delivery.status === 'NOT_SENT'
  ) || (
    invitation.delivery.status === 'FAILED' &&
    invitation.delivery.lastErrorCode === 'EMAIL_NOT_CONFIGURED'
  )
}

export type EmailDeliveryProvider = 'EMAILJS' | 'DISABLED'
export type EmailDeliveryStatus = 'NOT_SENT' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED'
export type EmailDeliveryErrorCode =
  | 'EMAIL_NOT_CONFIGURED'
  | 'INVALID_RECIPIENT'
  | 'INVALID_SCHEDULING_URL'
  | 'PROVIDER_REQUEST_FAILED'
  | 'PROVIDER_REJECTED'
  | 'UNKNOWN_EMAIL_ERROR'

export type SchedulingInvitationEmailInput = {
  invitationId: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  schedulingUrl: string
  expiresAt: string
  companyName: string
}

export type EmailDeliveryResult = {
  success: boolean
  provider: EmailDeliveryProvider
  providerMessageId?: string
  errorCode?: EmailDeliveryErrorCode
  errorMessage?: string
}

import type { SchedulingEmailService } from './emailService'
export function createDisabledSchedulingEmailService(): SchedulingEmailService {
  return { async sendSchedulingInvitation() { return { success: false, provider: 'DISABLED', errorCode: 'EMAIL_NOT_CONFIGURED', errorMessage: 'Automatic email delivery is not configured.' } } }
}

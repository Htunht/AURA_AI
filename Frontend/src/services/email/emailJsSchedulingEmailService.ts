import emailjs from '@emailjs/browser'
import type { EmailConfig } from '../../config/emailConfig'
import { validateSchedulingEmailInput } from '../../utils/emailValidation'
import type { SchedulingEmailService } from './emailService'
import { mapEmailJsError } from './mapEmailJsError'

export function createEmailJsSchedulingEmailService(config: NonNullable<EmailConfig['emailJs']>): SchedulingEmailService {
  return { async sendSchedulingInvitation(input) {
    const validation = validateSchedulingEmailInput(input)
    if (!validation.valid) return { success: false, provider: 'EMAILJS', errorCode: validation.errors.some((item) => item.includes('email')) ? 'INVALID_RECIPIENT' : 'INVALID_SCHEDULING_URL', errorMessage: validation.errors[0] }
    try {
      const response = await emailjs.send(config.serviceId, config.schedulingTemplateId, {
        to_email: input.candidateEmail, to_name: input.candidateName, job_title: input.jobTitle,
        company_name: input.companyName, scheduling_url: input.schedulingUrl,
        invitation_expires_at: input.expiresAt,
      }, { publicKey: config.publicKey })
      return { success: true, provider: 'EMAILJS', providerMessageId: response.text || undefined }
    } catch (error) { return { success: false, provider: 'EMAILJS', ...mapEmailJsError(error) } }
  } }
}

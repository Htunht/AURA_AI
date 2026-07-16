import type { EmailConfig } from '../../config/emailConfig'
import { createDisabledSchedulingEmailService } from './disabledSchedulingEmailService'
import { createEmailJsSchedulingEmailService } from './emailJsSchedulingEmailService'
export function createSchedulingEmailService(config: EmailConfig) { return config.provider === 'emailjs' && config.emailJs ? createEmailJsSchedulingEmailService(config.emailJs) : createDisabledSchedulingEmailService() }

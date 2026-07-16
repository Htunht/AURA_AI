import type { EmailDeliveryResult, SchedulingInvitationEmailInput } from '../../types/emailDelivery'
export interface SchedulingEmailService { sendSchedulingInvitation(input: SchedulingInvitationEmailInput): Promise<EmailDeliveryResult> }

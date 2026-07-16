import type { Candidate } from '../../types/candidate'
import type { InterviewSchedulingInvitation } from '../../types/interviewSchedulingInvitation'
import type { Job } from '../../types/job'
import type { SchedulingInvitationEmailInput } from '../../types/emailDelivery'
export function buildSchedulingEmailInput({ invitation, candidate, job, appPublicUrl }: { invitation: InterviewSchedulingInvitation; candidate: Candidate; job: Job; appPublicUrl: string }): SchedulingInvitationEmailInput {
  return { invitationId: invitation.id, candidateName: candidate.fullName, candidateEmail: candidate.email, jobTitle: job.title, schedulingUrl: `${appPublicUrl.replace(/\/$/, '')}/schedule/${encodeURIComponent(invitation.token)}`, expiresAt: invitation.expiresAt, companyName: 'AURA Technology' }
}

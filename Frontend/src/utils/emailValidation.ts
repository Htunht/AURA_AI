import type { SchedulingInvitationEmailInput } from '../types/emailDelivery'

export function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function validateSchedulingEmailInput(input: SchedulingInvitationEmailInput): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!input.candidateName.trim()) errors.push('Candidate name is required.')
  if (!isValidEmailAddress(input.candidateEmail)) errors.push('Candidate email is invalid.')
  if (!input.jobTitle.trim()) errors.push('Job title is required.')
  try { const url = new URL(input.schedulingUrl); if (!['http:', 'https:'].includes(url.protocol)) errors.push('Scheduling URL is invalid.') } catch { errors.push('Scheduling URL is invalid.') }
  if (!input.companyName.trim()) errors.push('Company name is required.')
  if (Number.isNaN(new Date(input.expiresAt).getTime())) errors.push('Invitation expiry is invalid.')
  return { valid: errors.length === 0, errors }
}

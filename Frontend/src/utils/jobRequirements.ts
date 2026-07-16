import type { Job } from '../types/job'
import type { JobRequirement } from '../types/jobRequirement'

export function requirementSlug(value: string) { return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

export function deriveJobRequirements(job: Job): JobRequirement[] {
  return [
    { id: `requirement-${job.id}-minimum-experience`, jobId: job.id, type: 'MINIMUM_EXPERIENCE', importance: 'REQUIRED', label: `Minimum ${job.minimumExperienceYears} years of experience`, minimumValue: job.minimumExperienceYears },
    ...job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED').map((skill) => ({ id: `requirement-${job.id}-required-skill-${requirementSlug(skill.name)}`, jobId: job.id, type: 'REQUIRED_SKILL' as const, importance: 'REQUIRED' as const, label: skill.name, skillName: skill.name, minimumValue: skill.minimumYears })),
    ...job.requiredSkills.filter((skill) => skill.priority === 'PREFERRED').map((skill) => ({ id: `requirement-${job.id}-preferred-skill-${requirementSlug(skill.name)}`, jobId: job.id, type: 'PREFERRED_SKILL' as const, importance: 'PREFERRED' as const, label: skill.name, skillName: skill.name, minimumValue: skill.minimumYears })),
    { id: `requirement-${job.id}-role-responsibilities`, jobId: job.id, type: 'RESPONSIBILITY', importance: 'SUPPORTING', label: 'Role responsibilities', description: job.description },
  ]
}

export function createJobRequirementFingerprint(job: Job): string {
  const values = deriveJobRequirements(job).map((requirement) => `${requirement.type}:${requirement.label.trim().toLocaleLowerCase()}:${requirement.minimumValue ?? ''}`).sort()
  return values.join('|')
}

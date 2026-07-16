export type JobRequirementType = 'MINIMUM_EXPERIENCE' | 'REQUIRED_SKILL' | 'PREFERRED_SKILL' | 'RESPONSIBILITY' | 'COMPETENCY'
export type JobRequirementImportance = 'REQUIRED' | 'PREFERRED' | 'SUPPORTING'
export type JobRequirement = { id: string; jobId: string; type: JobRequirementType; importance: JobRequirementImportance; label: string; description?: string; skillName?: string; minimumValue?: number }

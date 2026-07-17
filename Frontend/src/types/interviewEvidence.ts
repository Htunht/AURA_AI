export type InterviewEvidenceType = 'EXPERIENCE' | 'TECHNICAL_SKILL' | 'PROBLEM_SOLVING' | 'COLLABORATION' | 'COMMUNICATION' | 'OWNERSHIP' | 'IMPACT' | 'MISSING_EVIDENCE' | 'CONCERN'
export type InterviewEvidenceStrength = 'STRONG' | 'MODERATE' | 'LIMITED'
export type InterviewEvidence = { id: string; analysisId: string; type: InterviewEvidenceType; strength: InterviewEvidenceStrength; title: string; summary: string; transcriptSegmentIds: string[]; questionIds: string[]; requirementIds: string[]; criterionKeys: string[]; interviewerNote?: string; createdAt: string; updatedAt: string }

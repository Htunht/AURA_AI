import type { InterviewEvidence } from './interviewEvidence'
export type InterviewAnalysisStatus = 'GENERATING' | 'DRAFT' | 'APPROVED' | 'GENERATION_FAILED'
export type InterviewAnalysis = { id: string; interviewId: string; transcriptId: string; version: number; status: InterviewAnalysisStatus; evidence: InterviewEvidence[]; strengths: string[]; concerns: string[]; missingEvidence: string[]; interviewerSummary: string; generationSummary?: string; generationError?: string; createdAt: string; updatedAt: string; approvedAt?: string; approvedBy?: string }

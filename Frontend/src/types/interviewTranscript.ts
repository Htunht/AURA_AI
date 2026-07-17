export type InterviewTranscriptStatus = 'DRAFT' | 'APPROVED'
export type TranscriptSource = 'MANUAL' | 'SIMULATED'
export type TranscriptSpeaker = 'INTERVIEWER' | 'CANDIDATE' | 'UNKNOWN'
export type InterviewTranscriptSegment = { id: string; transcriptId: string; order: number; speaker: TranscriptSpeaker; speakerLabel?: string; text: string; startedAtSeconds?: number; endedAtSeconds?: number; questionId?: string; createdAt: string; updatedAt: string }
export type InterviewTranscript = { id: string; interviewId: string; sessionId: string; source: TranscriptSource; status: InterviewTranscriptStatus; rawText: string; segments: InterviewTranscriptSegment[]; createdAt: string; updatedAt: string; approvedAt?: string; approvedBy?: string }

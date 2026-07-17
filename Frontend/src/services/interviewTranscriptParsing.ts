import type { InterviewTranscriptSegment, TranscriptSpeaker } from '../types/interviewTranscript'
import { createNextTranscriptSegmentId } from '../utils/interviewPostReviewIds'
export type TranscriptParsingResult = { segments: InterviewTranscriptSegment[]; warnings: string[] }
const speakerMap: Record<string, TranscriptSpeaker> = { interviewer: 'INTERVIEWER', recruiter: 'INTERVIEWER', 'hiring manager': 'INTERVIEWER', candidate: 'CANDIDATE', applicant: 'CANDIDATE', unknown: 'UNKNOWN' }
export function parseInterviewTranscript({ transcriptId, interviewId, rawText, createdAt }: { transcriptId: string; interviewId: string; rawText: string; createdAt: string }): TranscriptParsingResult {
  const warnings: string[] = []; const blocks: Array<{ label?: string; text: string }> = []; const pattern = /^(Interviewer|Recruiter|Hiring Manager|Candidate|Applicant|Unknown)\s*:\s*/i; let current: { label?: string; text: string } | undefined
  rawText.split(/\r?\n/).forEach((line) => {
    const match = line.match(pattern)
    if (match) {
      if (current?.text.trim()) blocks.push(current)
      current = { label: match[1], text: line.replace(pattern, '').trim() }
    } else if (line.trim()) {
      if (current) current.text += `\n${line.trim()}`
      else current = { text: line.trim() }
    }
  })
  if (current?.text.trim()) blocks.push(current)
  if (!blocks.length && rawText.trim()) blocks.push({ text: rawText.trim() }); if (blocks.some((item) => !item.label)) warnings.push('Some transcript text did not include a recognized speaker label.')
  const segments: InterviewTranscriptSegment[] = []; blocks.forEach((block, index) => segments.push({ id: createNextTranscriptSegmentId(segments, interviewId), transcriptId, order: index + 1, speaker: block.label ? speakerMap[block.label.toLocaleLowerCase()] ?? 'UNKNOWN' : 'UNKNOWN', speakerLabel: block.label, text: block.text.trim().replace(/[ \t]+/g, ' '), createdAt, updatedAt: createdAt }))
  return { segments, warnings }
}

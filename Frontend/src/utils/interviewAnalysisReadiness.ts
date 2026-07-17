import type { InterviewAnalysis } from '../types/interviewAnalysis'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { InterviewTranscript } from '../types/interviewTranscript'
import type { JobRequirement } from '../types/jobRequirement'

export type AnalysisListKey = 'strengths' | 'concerns' | 'missingEvidence'
export type EvidenceIssueField = 'title' | 'summary' | 'transcriptSegmentIds' | 'questionIds' | 'requirementIds'
export type EvidenceValidationReason = { field: EvidenceIssueField; message: string }
export type EvidenceValidationIssue = { evidenceId: string; evidenceIndex: number; reasons: EvidenceValidationReason[] }
export type DuplicateAnalysisListItem = { listKey: AnalysisListKey; listLabel: string; text: string; firstIndex: number; duplicateIndex: number }
export type InterviewAnalysisReadiness = {
  ready: boolean
  evidenceCount: number
  strongEvidenceCount: number
  moderateEvidenceCount: number
  limitedEvidenceCount: number
  evidenceIssues: EvidenceValidationIssue[]
  duplicateListItems: DuplicateAnalysisListItem[]
  generalBlockingIssues: string[]
  blockingIssues: string[]
  warnings: string[]
}

export function normalizeAnalysisListText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function findDuplicateAnalysisListItems(analysis: Pick<InterviewAnalysis, AnalysisListKey>): DuplicateAnalysisListItem[] {
  const labels: Record<AnalysisListKey, string> = { strengths: 'Strengths', concerns: 'Concerns', missingEvidence: 'Missing evidence' }
  return (Object.keys(labels) as AnalysisListKey[]).flatMap((listKey) => {
    const firstIndexes = new Map<string, number>()
    return analysis[listKey].flatMap((text, duplicateIndex) => {
      const key = normalizeAnalysisListText(text)
      const firstIndex = firstIndexes.get(key)
      if (!key) return []
      if (firstIndex === undefined) { firstIndexes.set(key, duplicateIndex); return [] }
      return [{ listKey, listLabel: labels[listKey], text: text.trim(), firstIndex, duplicateIndex }]
    })
  })
}

export function removeDuplicateAnalysisListItems<T extends Pick<InterviewAnalysis, AnalysisListKey>>(analysis: T): Pick<InterviewAnalysis, AnalysisListKey> {
  const clean = (items: string[]) => {
    const seen = new Set<string>()
    return items.filter((item) => {
      const key = normalizeAnalysisListText(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
  return { strengths: clean(analysis.strengths), concerns: clean(analysis.concerns), missingEvidence: clean(analysis.missingEvidence) }
}

export function evaluateInterviewAnalysisReadiness({ analysis, transcript, requirements, questionSet }: { analysis: InterviewAnalysis; transcript: InterviewTranscript; requirements: JobRequirement[]; questionSet: InterviewQuestionSet }): InterviewAnalysisReadiness {
  const generalBlockingIssues: string[] = []
  const warnings: string[] = []
  const segmentIds = new Set(transcript.segments.map((item) => item.id))
  const questionIds = new Set(questionSet.questions.map((item) => item.id))
  const requirementIds = new Set(requirements.map((item) => item.id))
  if (transcript.status !== 'APPROVED') generalBlockingIssues.push('Approve the transcript first.')
  if (!analysis.evidence.length) generalBlockingIssues.push('Add at least one supported evidence item.')
  if (!analysis.interviewerSummary.trim()) generalBlockingIssues.push('Add an interviewer summary.')

  const evidenceIssues = analysis.evidence.flatMap<EvidenceValidationIssue>((item, evidenceIndex) => {
    const reasons: EvidenceValidationReason[] = []
    const titleLength = item.title.trim().length
    const summaryLength = item.summary.trim().length
    if (!titleLength) reasons.push({ field: 'title', message: 'Add an evidence title.' })
    else if (titleLength < 3) reasons.push({ field: 'title', message: 'Use at least 3 characters for the title.' })
    if (!summaryLength) reasons.push({ field: 'summary', message: 'Add an evidence summary.' })
    else if (summaryLength < 10) reasons.push({ field: 'summary', message: 'Use at least 10 characters for the summary.' })
    if (item.type !== 'MISSING_EVIDENCE' && !item.transcriptSegmentIds.length && (item.interviewerNote?.trim().length ?? 0) < 10) reasons.push({ field: 'transcriptSegmentIds', message: 'Select a supporting candidate transcript segment or add a factual interviewer note.' })
    if (item.transcriptSegmentIds.some((id) => !segmentIds.has(id))) reasons.push({ field: 'transcriptSegmentIds', message: 'Remove or replace the invalid transcript segment reference.' })
    if (item.questionIds.some((id) => !questionIds.has(id))) reasons.push({ field: 'questionIds', message: 'Remove or replace the invalid interview question mapping.' })
    if (item.requirementIds.some((id) => !requirementIds.has(id))) reasons.push({ field: 'requirementIds', message: 'Remove or replace the invalid job requirement mapping.' })
    return reasons.length ? [{ evidenceId: item.id, evidenceIndex, reasons }] : []
  })
  const duplicateListItems = findDuplicateAnalysisListItems(analysis)
  const blockingIssues = [
    ...generalBlockingIssues,
    ...(evidenceIssues.length ? [`${evidenceIssues.length} evidence ${evidenceIssues.length === 1 ? 'item needs' : 'items need'} correction`] : []),
    ...(duplicateListItems.length ? [`${duplicateListItems.length} duplicate analysis ${duplicateListItems.length === 1 ? 'entry needs' : 'entries need'} removal`] : []),
  ]
  const strongEvidenceCount = analysis.evidence.filter((item) => item.strength === 'STRONG').length
  const moderateEvidenceCount = analysis.evidence.filter((item) => item.strength === 'MODERATE').length
  const limitedEvidenceCount = analysis.evidence.filter((item) => item.strength === 'LIMITED').length
  if (!strongEvidenceCount) warnings.push('No evidence is currently marked strong.')
  if (!analysis.concerns.length) warnings.push('No concerns are listed.')
  if (transcript.source === 'SIMULATED') warnings.push('The analysis uses a simulated transcript.')
  const covered = new Set(analysis.evidence.flatMap((item) => item.requirementIds))
  if (requirements.filter((item) => item.importance === 'REQUIRED' && !covered.has(item.id)).length) warnings.push('Some required qualifications remain uncovered.')
  return { ready: blockingIssues.length === 0, evidenceCount: analysis.evidence.length, strongEvidenceCount, moderateEvidenceCount, limitedEvidenceCount, evidenceIssues, duplicateListItems, generalBlockingIssues, blockingIssues, warnings }
}

import type { InterviewEvidence } from '../types/interviewEvidence'

export type EvidenceSignals = { hasRelevantExample: boolean; hasPersonalOwnership: boolean; hasSpecificActions: boolean; hasTechnicalOrBehavioralDetail: boolean; hasTradeOffs: boolean; hasObservableOutcome: boolean; hasMeasurableOutcome: boolean; hasReflection: boolean; isResponsiveToQuestion: boolean }

const matches = (text: string, pattern: RegExp) => pattern.test(text)
export function detectInterviewEvidenceSignals(text: string, evidence: InterviewEvidence[]): EvidenceSignals {
  const normalized = text.trim()
  const supported = evidence.length > 0
  return {
    hasRelevantExample: supported || matches(normalized, /\b(example|project|situation|production|incident|when)\b/i),
    hasPersonalOwnership: matches(normalized, /\b(i|my|owned|led|built|implemented|designed|resolved|created|decided)\b/i),
    hasSpecificActions: matches(normalized, /\b(implemented|migrated|tested|debugged|analyzed|measured|deployed|refactored|coordinated)\b/i),
    hasTechnicalOrBehavioralDetail: supported || matches(normalized, /\b(api|react|typescript|database|architecture|stakeholder|team|customer|performance|security|testing)\b/i),
    hasTradeOffs: matches(normalized, /\b(trade-?off|instead|alternative|constraint|because|risk|option)\b/i),
    hasObservableOutcome: matches(normalized, /\b(result|outcome|improved|reduced|increased|delivered|resolved|impact|saved)\b/i),
    hasMeasurableOutcome: /\b\d+(?:\.\d+)?\s*(?:%|percent|hours?|days?|weeks?|ms|seconds?|users?|customers?)\b/i.test(normalized),
    hasReflection: matches(normalized, /\b(learned|next time|in hindsight|would change|reflection|alternative)\b/i),
    isResponsiveToQuestion: supported || normalized.split(/\s+/).length >= 5,
  }
}

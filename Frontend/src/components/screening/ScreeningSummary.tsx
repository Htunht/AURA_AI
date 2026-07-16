import { Badge } from '../ui/Badge'
import type { Decision } from '../../types/decision'
import type { Evaluation } from '../../types/evaluation'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'

type ScreeningSummaryProps = {
  evaluation: Evaluation
  decision?: Decision
}

function recommendationTone(recommendation: Evaluation['recommendation']) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  return 'danger'
}

function confidenceLabel(confidence: number) {
  if (confidence >= 85) return 'High confidence'
  if (confidence >= 70) return 'Moderate confidence'
  return 'Limited confidence'
}

export function ScreeningSummary({ evaluation, decision }: ScreeningSummaryProps) {
  return (
    <section className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs" aria-labelledby="screening-result-title">
      <div className="grid md:grid-cols-[220px_1fr]">
        <div className="flex items-center gap-5 border-b border-harbor/10 bg-frost/70 p-5 md:block md:border-b-0 md:border-r md:p-6">
          <div className="grid size-24 flex-none place-items-center rounded-full border-[7px] border-glacier/35 bg-white shadow-aura-xs md:size-28">
            <span className="text-center"><strong className="block text-3xl tracking-[-0.05em] text-depth">{Math.round(evaluation.overallScore)}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">out of 100</span></span>
          </div>
          <div className="md:mt-4">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Overall score</p>
            <p className="mb-0 mt-1 text-xs leading-5 text-aura-text-muted">Weighted across the configured evaluation criteria.</p>
          </div>
        </div>
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">AI screening result</p>
              <h2 id="screening-result-title" className="mb-0 mt-2 text-2xl font-semibold tracking-[-0.02em] text-depth">{getScreeningRecommendationLabel(evaluation.recommendation)}</h2>
            </div>
            <Badge tone={decision ? 'accent' : 'warning'}>{decision ? 'Recruiter reviewed' : 'Awaiting recruiter review'}</Badge>
          </div>
          <p className="mb-0 mt-3 max-w-3xl text-sm leading-6 text-aura-text-secondary">{evaluation.summary}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-aura-sm border border-harbor/10 bg-frost/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Recommendation</span>
              <div className="mt-2"><Badge tone={recommendationTone(evaluation.recommendation)}>{getScreeningRecommendationLabel(evaluation.recommendation)}</Badge></div>
            </div>
            <div className="rounded-aura-sm border border-harbor/10 bg-frost/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Confidence</span>
              <p className="mb-0 mt-1 text-sm font-semibold text-depth">{evaluation.confidence}% · {confidenceLabel(evaluation.confidence)}</p>
            </div>
          </div>
          <p className="mb-0 mt-4 text-xs leading-5 text-aura-text-muted">Confidence reflects how strongly the available evidence supports the recommendation. It is not a final hiring decision.</p>
        </div>
      </div>
    </section>
  )
}

import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CandidateListItem } from '../../store/demoSelectors'
import { formatApplicationStage, formatDate } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Badge } from '../ui/Badge'

type CandidateTableProps = {
  items: CandidateListItem[]
  onRetryFailed: (applicationId: string) => void
}

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export function CandidateTable({ items, onRetryFailed }: CandidateTableProps) {
  return (
    <div className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-frost/80 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted">
          <tr>
            <th className="px-4 py-3 font-bold">Candidate</th>
            <th className="px-4 py-3 font-bold">Applied role</th>
            <th className="px-4 py-3 font-bold">Experience</th>
            <th className="px-4 py-3 font-bold">Screening status</th>
            <th className="px-4 py-3 font-bold">AI result</th>
            <th className="px-4 py-3 font-bold">Current stage</th>
            <th className="px-4 py-3 font-bold">Submitted</th>
            <th className="px-4 py-3"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-harbor/10">
          {items.map(({ candidate, application, job, screeningEvaluation, decision, screeningStatus }) => {
            const recommendation = decision?.humanRecommendation ?? screeningEvaluation?.recommendation
            return (
              <tr key={application.id} className="transition-colors hover:bg-glacier/[0.07]">
                <td className="px-4 py-4 align-top">
                  <Link className="font-semibold text-depth no-underline hover:text-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/candidates/${candidate.id}`}>
                    {candidate.fullName}
                  </Link>
                  <span className="mt-1 block text-xs text-aura-text-muted">{candidate.email}</span>
                  <span className="mt-1 block text-xs text-aura-text-secondary">{candidate.currentPosition}</span>
                </td>
                <td className="max-w-44 px-4 py-4 align-top font-medium text-depth">{job.title}</td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-aura-text-secondary">{candidate.yearsExperience} years</td>
                <td className="px-4 py-4 align-top">
                  {screeningStatus === 'COMPLETED' ? <Badge tone="success">Screening completed</Badge> : null}
                  {screeningStatus === 'NOT_SCREENED' ? <Badge>Not screened</Badge> : null}
                  {screeningStatus === 'QUEUED' ? <><Badge tone="accent">Queued for screening</Badge><span className="mt-1.5 block text-[10px] text-aura-text-muted">Waiting for AURA analysis</span></> : null}
                  {screeningStatus === 'PROCESSING' ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-marine"><LoaderCircle size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Screening in progress</span> : null}
                  {screeningStatus === 'FAILED' ? <div><Badge tone="danger">Screening failed</Badge><button type="button" className="mt-1.5 block text-xs font-semibold text-harbor hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" onClick={() => onRetryFailed(application.id)} aria-label={`Retry screening for ${candidate.fullName}`}>Retry screening</button></div> : null}
                </td>
                <td className="px-4 py-4 align-top">
                  {screeningStatus === 'COMPLETED' && recommendation && screeningEvaluation ? <><Badge tone={recommendationTone(recommendation)}>{getScreeningRecommendationLabel(recommendation)}</Badge><span className="mt-1.5 block text-xs font-semibold text-depth">{Math.round(screeningEvaluation.overallScore)}/100 · {screeningEvaluation.confidence}% confidence</span><span className="mt-1 block text-[10px] text-aura-text-muted">{decision ? decision.reviewAction === 'CONFIRM' ? 'Recruiter confirmed' : `Overrode AURA: ${getScreeningRecommendationLabel(decision.aiRecommendation)}` : 'Recruiter review pending'}</span></> : <span className="text-aura-text-muted">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-aura-text-secondary">{formatApplicationStage(application.currentStage)}</td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-aura-text-secondary">{formatDate(application.submittedAt)}</td>
                <td className="px-4 py-4 align-top">
                  <Link className="inline-flex text-harbor hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={screeningStatus === 'COMPLETED' ? `/reviews?applicationId=${application.id}` : `/candidates/${candidate.id}`} aria-label={screeningStatus === 'COMPLETED' ? `Review ${candidate.fullName}` : `View ${candidate.fullName}`}>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

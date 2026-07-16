import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CandidateListItem } from '../../store/demoSelectors'
import { formatApplicationStage, formatDate } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'
import { Badge } from '../ui/Badge'

type CandidateTableProps = {
  items: CandidateListItem[]
}

function recommendationTone(recommendation?: string) {
  if (recommendation === 'STRONG_YES' || recommendation === 'YES') return 'success'
  if (recommendation === 'REVIEW') return 'warning'
  if (recommendation === 'NO' || recommendation === 'STRONG_NO') return 'danger'
  return 'neutral'
}

export function CandidateTable({ items }: CandidateTableProps) {
  return (
    <div className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-frost/80 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted">
          <tr>
            <th className="px-4 py-3 font-bold">Candidate</th>
            <th className="px-4 py-3 font-bold">Applied role</th>
            <th className="px-4 py-3 font-bold">Experience</th>
            <th className="px-4 py-3 font-bold">AI recommendation</th>
            <th className="px-4 py-3 font-bold">Score</th>
            <th className="px-4 py-3 font-bold">Current stage</th>
            <th className="px-4 py-3 font-bold">Submitted</th>
            <th className="px-4 py-3"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-harbor/10">
          {items.map(({ candidate, application, job, screeningEvaluation }) => {
            const recommendation = screeningEvaluation?.recommendation
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
                  <Badge tone={recommendationTone(recommendation)}>
                    {recommendation ? getScreeningRecommendationLabel(recommendation) : 'Not screened'}
                  </Badge>
                </td>
                <td className="px-4 py-4 align-top font-semibold text-depth">{screeningEvaluation ? Math.round(screeningEvaluation.overallScore) : '—'}</td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-aura-text-secondary">{formatApplicationStage(application.currentStage)}</td>
                <td className="whitespace-nowrap px-4 py-4 align-top text-aura-text-secondary">{formatDate(application.submittedAt)}</td>
                <td className="px-4 py-4 align-top">
                  <Link className="inline-flex text-harbor hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/candidates/${candidate.id}`} aria-label={`View ${candidate.fullName}`}>
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

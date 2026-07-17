import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CandidateListItem } from '../../store/demoSelectors'
import { formatCandidateSubmittedDate } from '../../utils/candidateListPresentation'
import { formatApplicationStage } from '../../utils/helpers'
import { Card } from '../ui/Card'
import { CandidateRecommendation } from './CandidateRecommendation'

type CandidateCardProps = {
  item: CandidateListItem
  onRetryFailed: () => void
}

export function CandidateCard({ item, onRetryFailed }: CandidateCardProps) {
  const { candidate, application, job, operationalStatus } = item
  const operationalIsUrgent = operationalStatus?.label.toLowerCase().includes('overdue')

  return (
    <Card className="grid gap-4 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <Link
            className="font-semibold text-depth no-underline hover:text-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier"
            to={`/candidates/${candidate.id}`}
          >
            {candidate.fullName}
          </Link>
          <p className="mt-0.5 truncate text-xs text-aura-text-muted">
            {candidate.email}
          </p>
        </div>
        <div className="ml-auto flex flex-none flex-col items-end gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wide text-aura-text-muted">Recommendation</span>
          <CandidateRecommendation item={item} onRetryFailed={onRetryFailed} align="end" />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-harbor/10 py-3">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Role</dt>
          <dd className="mt-1 text-sm font-semibold text-depth">{job.title}</dd>
          <dd className="mt-0.5 text-xs text-aura-text-muted">{candidate.yearsExperience} years</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Stage</dt>
          <dd className="mt-1 text-xs font-bold uppercase tracking-[0.06em] text-depth">{formatApplicationStage(application.currentStage)}</dd>
          {operationalStatus ? <dd className={`mt-0.5 text-xs ${operationalIsUrgent ? 'font-semibold text-aura-danger' : 'text-aura-text-muted'}`}>{operationalStatus.label}{operationalStatus.occurredAt ? ` · ${formatCandidateSubmittedDate(operationalStatus.occurredAt)}` : ''}</dd> : null}
        </div>
      </dl>
      <Link className="inline-flex min-h-10 items-center justify-between rounded-aura-sm text-sm font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/candidates/${candidate.id}`} aria-label={`View candidate ${candidate.fullName}`}>View candidate <ArrowRight size={16} aria-hidden="true" /></Link>
    </Card>
  )
}

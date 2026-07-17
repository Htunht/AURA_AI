import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CandidateListItem } from '../../store/demoSelectors'
import {
  formatCandidateSubmittedDate,
  formatCandidateSubmittedDateLabel,
} from '../../utils/candidateListPresentation'
import { formatApplicationStage } from '../../utils/helpers'
import { CandidateRecommendation } from './CandidateRecommendation'

type CandidateTableProps = {
  items: CandidateListItem[]
  onRetryFailed: (applicationId: string) => void
}

export function CandidateTable({ items, onRetryFailed }: CandidateTableProps) {
  return (
    <div className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead className="bg-frost/80 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted">
          <tr>
            <th scope="col" className="w-[22%] px-4 py-2.5 font-bold xl:w-[19%]">Candidate</th>
            <th scope="col" className="w-[22%] px-4 py-2.5 font-bold xl:w-[18%]">Role</th>
            <th scope="col" className="w-[21%] px-4 py-2.5 font-bold xl:w-[18%]">Recommendation</th>
            <th scope="col" className="w-[19%] px-4 py-2.5 font-bold xl:w-[17%]">Stage</th>
            <th scope="col" className="hidden w-[11%] px-4 py-2.5 font-bold xl:table-cell">Submitted</th>
            <th scope="col" className="w-[16%] px-4 py-2.5 text-right font-bold xl:w-[17%]">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-harbor/10">
          {items.map((item) => {
            const { candidate, application, job, operationalStatus } = item
            const operationalIsUrgent = operationalStatus?.label.toLowerCase().includes('overdue')
            return (
              <tr key={application.id} className="group transition-colors hover:bg-glacier/[0.07] focus-within:bg-glacier/[0.07]">
                <td className="px-4 py-3 align-middle">
                  <Link className="block truncate font-semibold text-depth no-underline hover:text-marine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/candidates/${candidate.id}`}>
                    {candidate.fullName}
                  </Link>
                  <span className="mt-0.5 block max-w-56 truncate text-xs text-aura-text-muted">{candidate.email}</span>
                </td>
                <td className="max-w-56 px-4 py-3 align-middle">
                  <span className="block truncate font-medium text-depth" title={job.title}>{job.title}</span>
                  <span className="mt-0.5 block text-xs text-aura-text-muted">{candidate.yearsExperience} years</span>
                </td>
                <td className="px-4 py-3 align-middle">
                  <CandidateRecommendation item={item} onRetryFailed={() => onRetryFailed(application.id)} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <span className="block text-xs font-bold uppercase tracking-[0.06em] text-depth">{formatApplicationStage(application.currentStage)}</span>
                  {operationalStatus ? <span className={`mt-0.5 block truncate text-xs ${operationalIsUrgent ? 'font-semibold text-aura-danger' : 'text-aura-text-muted'}`} title={operationalStatus.label}>{operationalStatus.label}{operationalStatus.occurredAt ? ` · ${formatCandidateSubmittedDate(operationalStatus.occurredAt)}` : ''}</span> : null}
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 align-middle text-aura-text-secondary xl:table-cell">
                  <time dateTime={application.submittedAt} title={formatCandidateSubmittedDateLabel(application.submittedAt)} aria-label={formatCandidateSubmittedDateLabel(application.submittedAt)}>{formatCandidateSubmittedDate(application.submittedAt)}</time>
                </td>
                <td className="px-4 py-3 text-right align-middle">
                  <Link className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-aura-sm px-2 text-xs font-semibold text-harbor no-underline hover:bg-glacier/10 hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to={`/candidates/${candidate.id}`} aria-label={`View candidate ${candidate.fullName}`}>
                    <span>View candidate</span>
                    <ArrowRight size={15} aria-hidden="true" />
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

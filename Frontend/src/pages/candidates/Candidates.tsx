import { ExternalLink, FilePenLine, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CandidateCard } from '../../components/candidates/CandidateCard'
import { CandidateTable } from '../../components/candidates/CandidateTable'
import { ScreeningAutomationStatus } from '../../components/screening/ScreeningAutomationStatus'
import { backendWorkspaceMode } from '../../config/workspaceMode'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import BackendCandidatesList from '../backend/BackendCandidatesList'
import { useDemoStore } from '../../hooks/useDemoStore'
import { useScreeningAutomation } from '../../hooks/useScreeningAutomation'
import {
  selectCandidateListItems,
  selectJobById,
  type CandidateScreeningDisplayStatus,
} from '../../store/demoSelectors'
import type { ApplicationStage } from '../../types/application'
import type { Recommendation } from '../../types/evaluation'
import { formatCandidateResultCount } from '../../utils/candidateListPresentation'
import { formatApplicationStage } from '../../utils/helpers'

type RecommendationFilter = Recommendation | 'ALL' | 'NOT_SCREENED'
type StageFilter = ApplicationStage | 'ALL'
type ScreeningStatusFilter = CandidateScreeningDisplayStatus | 'ALL'

const recommendationOptions: Array<{ value: RecommendationFilter; label: string }> = [
  { value: 'ALL', label: 'All recommendations' },
  { value: 'STRONG_YES', label: 'Strong shortlist' },
  { value: 'YES', label: 'Shortlist' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'NO', label: 'Not recommended' },
  { value: 'STRONG_NO', label: 'Strong not recommended' },
  { value: 'NOT_SCREENED', label: 'Not screened' },
]

const selectClass = 'h-10 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'
const actionLinkClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#1E2022]/30 bg-transparent px-4 text-sm font-semibold text-[#1E2022]/85 no-underline transition-all hover:border-[#1E2022] hover:text-[#1E2022] hover:bg-[#1E2022]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E2022]'

export default function Candidates() {
  if (backendWorkspaceMode) return <BackendCandidatesList />
  return <DemoCandidates />
}

function DemoCandidates() {
  const { jobId } = useParams()
  const { state } = useDemoStore()
  const { retryFailed } = useScreeningAutomation()
  const job = jobId ? selectJobById(state, jobId) : undefined
  const allItems = useMemo(() => selectCandidateListItems(state, jobId), [state, jobId])
  const [search, setSearch] = useState('')
  const [recommendation, setRecommendation] = useState<RecommendationFilter>('ALL')
  const [stage, setStage] = useState<StageFilter>('ALL')
  const [selectedJobId, setSelectedJobId] = useState('ALL')
  const [screeningStatus, setScreeningStatus] = useState<ScreeningStatusFilter>('ALL')
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const stages = Array.from(new Set(allItems.map((item) => item.application.currentStage)))

  const filteredItems = allItems.filter((item) => {
    const searchSource = [item.candidate.fullName, item.candidate.email, item.candidate.currentPosition, item.job.title, ...item.candidate.skills].join(' ').toLowerCase()
    const matchesSearch = searchSource.includes(search.trim().toLowerCase())
    const itemRecommendation = item.decision?.humanRecommendation ?? item.screeningEvaluation?.recommendation
    const matchesRecommendation = recommendation === 'ALL' || (recommendation === 'NOT_SCREENED' ? !itemRecommendation : itemRecommendation === recommendation)
    const matchesStage = stage === 'ALL' || item.application.currentStage === stage
    const matchesJob = jobId || selectedJobId === 'ALL' || item.job.id === selectedJobId
    const matchesScreeningStatus = screeningStatus === 'ALL' || item.screeningStatus === screeningStatus
    return matchesSearch && matchesRecommendation && matchesStage && matchesJob && matchesScreeningStatus
  })

  if (jobId && !job) {
    return <PageContainer title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening does not exist.</Card></PageContainer>
  }

  const noApplicationsForRole = Boolean(jobId && allItems.length === 0)
  return (
    <PageContainer
      eyebrow={job ? job.department : 'Recruitment'}
      title={job ? `${job.title} candidates` : 'Candidates'}
      description={job ? 'Review applications and candidate progress for this role.' : 'Review submitted applications and track candidate progress across active hiring processes.'}
      actions={job ? <><Link className={actionLinkClass} to={`/apply/${job.id}`}><ExternalLink size={16} aria-hidden="true" />Open application form</Link><Link className={actionLinkClass} to={`/jobs/${job.id}/application-form`}><FilePenLine size={16} aria-hidden="true" />Manage application form</Link></> : undefined}
    >
      <ScreeningAutomationStatus compact />
      <Card className="mb-3 p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="relative min-w-60 flex-[1_1_280px]">
            <span className="sr-only">Search candidates</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} aria-hidden="true" />
            <Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, role, or skill" />
          </label>
          <label className="w-full sm:w-48">
            <span className="sr-only">Recommendation</span>
            <select className={selectClass} value={recommendation} onChange={(event) => setRecommendation(event.target.value as RecommendationFilter)}>
              {recommendationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="w-full sm:w-44">
            <span className="sr-only">Application stage</span>
            <select className={selectClass} value={stage} onChange={(event) => setStage(event.target.value as StageFilter)}>
              <option value="ALL">All stages</option>
              {stages.map((value) => <option key={value} value={value}>{formatApplicationStage(value)}</option>)}
            </select>
          </label>
          {!job ? (
            <label className="w-full sm:w-52">
              <span className="sr-only">Job opening</span>
              <select className={selectClass} value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
                <option value="ALL">All job openings</option>
                {state.jobs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-aura-sm border px-3 text-sm font-semibold transition-colors sm:w-auto ${moreFiltersOpen || screeningStatus !== 'ALL' ? 'border-marine/40 bg-glacier/10 text-depth' : 'border-harbor/20 bg-white text-harbor hover:bg-frost/65'}`}
            onClick={() => setMoreFiltersOpen((open) => !open)}
            aria-expanded={moreFiltersOpen}
            aria-controls="candidate-more-filters"
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            More filters
            {screeningStatus !== 'ALL' ? <span className="h-1.5 w-1.5 rounded-full bg-marine" aria-label="Screening filter active" /> : null}
          </button>
        </div>
        {moreFiltersOpen ? (
          <div id="candidate-more-filters" className="mt-3 border-t border-harbor/10 pt-3">
            <label className="block w-full sm:w-56">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">Screening status</span>
              <select className={selectClass} value={screeningStatus} onChange={(event) => setScreeningStatus(event.target.value as ScreeningStatusFilter)}>
                <option value="ALL">All screening statuses</option>
                <option value="SETUP_REQUIRED">Setup required</option>
                <option value="NOT_SCREENED">Not screened</option>
                <option value="QUEUED">Queued</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>
          </div>
        ) : null}
        <p className="mb-0 mt-2.5 text-xs font-medium text-aura-text-muted" aria-live="polite">{formatCandidateResultCount(filteredItems.length, allItems.length)}</p>
      </Card>

      {filteredItems.length > 0 ? (
        <><div className="hidden md:block"><CandidateTable items={filteredItems} onRetryFailed={(applicationId) => retryFailed([applicationId])} /></div><div className="grid gap-3 md:hidden">{filteredItems.map((item) => <CandidateCard item={item} onRetryFailed={() => retryFailed([item.application.id])} key={item.application.id} />)}</div></>
      ) : (
        <Card className="p-8 text-center md:p-12">
          <h2 className="m-0 text-lg font-semibold text-depth">{noApplicationsForRole ? 'No applications have been submitted for this role.' : 'No candidates match the selected filters.'}</h2>
          {noApplicationsForRole && job ? <Link className="mt-4 inline-flex text-sm font-semibold text-harbor hover:text-depth" to={`/apply/${job.id}`}>Open public application</Link> : null}
        </Card>
      )}
    </PageContainer>
  )
}

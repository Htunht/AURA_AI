import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HumanReviewCard } from '../../components/reviews/HumanReviewCard'
import { HumanReviewTable } from '../../components/reviews/HumanReviewTable'
import { HumanReviewWorkspace } from '../../components/reviews/HumanReviewWorkspace'
import { backendWorkspaceMode } from '../../config/workspaceMode'
import { PageContainer } from '../../components/layout/PageContainer'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { useDemoStore } from '../../hooks/useDemoStore'
import {
  selectHumanReviewQueueItem,
  selectHumanReviewQueueItems,
  selectHumanReviewQueueSummary,
} from '../../store/demoSelectors'
import type { HumanReviewCategory } from '../../types/reviewQueue'
import { isBackendUuid, isDemoId } from '../../utils/backendIds'
import BackendScreeningQueue from '../backend/BackendScreeningQueue'

type CategoryFilter = HumanReviewCategory | 'ALL'
type ConfidenceFilter = 'ALL' | 'BELOW_60' | '60_74' | '75_89' | '90_PLUS'

const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'NEEDS_REVIEW', label: 'Needs review' },
  { value: 'RECOMMENDED', label: 'Recommended' },
  { value: 'NOT_RECOMMENDED', label: 'Not recommended' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REVIEWED', label: 'Reviewed' },
]

const selectClass = 'h-10 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'

function confidenceMatches(confidence: number | undefined, filter: ConfidenceFilter) {
  if (filter === 'ALL') return true
  if (confidence === undefined) return false
  if (filter === 'BELOW_60') return confidence < 60
  if (filter === '60_74') return confidence >= 60 && confidence < 75
  if (filter === '75_89') return confidence >= 75 && confidence < 90
  return confidence >= 90
}

function emptyState(category: CategoryFilter) {
  if (category === 'NEEDS_REVIEW') return ['No pending reviews', 'No candidates currently require recruiter review. New completed screening results will appear here automatically.']
  if (category === 'RECOMMENDED') return ['No recommended candidates', 'No recommended candidates are awaiting review.']
  if (category === 'NOT_RECOMMENDED') return ['No negative recommendations', 'No not-recommended candidates are awaiting review.']
  if (category === 'REVIEWED') return ['All reviewed', 'All available screening recommendations have been reviewed.']
  if (category === 'FAILED') return ['No screening failures', 'No screening exceptions currently require recruiter attention.']
  return ['No review items found', 'No candidates match the selected filters.']
}

export default function HumanReviewQueue() {
  const [searchParams] = useSearchParams()
  const requestedApplicationId = searchParams.get('applicationId')
  const shouldUseBackendQueue =
    backendWorkspaceMode &&
    (!requestedApplicationId ||
      (!isDemoId(requestedApplicationId) && isBackendUuid(requestedApplicationId)))

  if (shouldUseBackendQueue) return <BackendScreeningQueue />
  return <DemoHumanReviewQueue />
}

function DemoHumanReviewQueue() {
  const { state } = useDemoStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedApplicationId = searchParams.get('applicationId')
  const requestedAction = searchParams.get('action')
  const returnTo = searchParams.get('returnTo')
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(requestedApplicationId ?? undefined)
  const [category, setCategory] = useState<CategoryFilter>('NEEDS_REVIEW')
  const [jobId, setJobId] = useState('ALL')
  const [search, setSearch] = useState('')
  const [confidence, setConfidence] = useState<ConfidenceFilter>('ALL')
  const items = useMemo(
    () => selectHumanReviewQueueItems(state, jobId === 'ALL' ? undefined : jobId),
    [jobId, state],
  )
  const summary = selectHumanReviewQueueSummary(state, jobId === 'ALL' ? undefined : jobId)
  const selectedItem = selectedApplicationId
    ? selectHumanReviewQueueItem(state, selectedApplicationId)
    : undefined
  const invalidTarget = Boolean(selectedApplicationId && !selectedItem)

  const filteredItems = items.filter((item) => {
    const searchSource = [
      item.candidate.fullName,
      item.candidate.email,
      item.candidate.currentPosition,
      item.job.title,
      ...item.candidate.skills,
    ].join(' ').toLowerCase()
    return (
      (category === 'ALL' || item.category === category) &&
      searchSource.includes(search.trim().toLowerCase()) &&
      confidenceMatches(item.evaluation?.confidence, confidence)
    )
  })
  const countByCategory: Record<CategoryFilter, number> = {
    ALL: summary.total,
    NEEDS_REVIEW: summary.needsReview,
    RECOMMENDED: summary.recommended,
    NOT_RECOMMENDED: summary.notRecommended,
    FAILED: summary.failed,
    REVIEWED: summary.reviewed,
  }
  const [emptyTitle] = emptyState(category)

  function openReview(applicationId: string) {
    setSelectedApplicationId(applicationId)
    const next = new URLSearchParams(searchParams)
    next.set('applicationId', applicationId)
    next.delete('action')
    setSearchParams(next)
  }

  function closeReview() {
    setSelectedApplicationId(undefined)
    if (returnTo?.startsWith('/candidates/')) {
      navigate(returnTo, { replace: true })
      return
    }
    const next = new URLSearchParams(searchParams)
    next.delete('applicationId')
    next.delete('action')
    setSearchParams(next)
  }

  return (
    <PageContainer
      title="Review queue"
      hideHeader
    >
      <div className="mx-auto max-w-[1240px]">
        <h1 className="mb-5 mt-0 text-[28px] font-bold tracking-[-0.025em] text-depth md:text-[32px]">Review queue</h1>

        <div className="mb-5 overflow-x-auto border-b border-harbor/15" role="tablist" aria-label="Review status">
          <div className="flex min-w-max gap-5">
          {categoryOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setCategory(option.value)}
              className={`relative flex h-11 items-center gap-2 border-0 bg-transparent px-0 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-glacier ${category === option.value ? 'text-depth after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-marine' : 'text-aura-text-muted hover:text-harbor'}`}
              role="tab"
              aria-selected={category === option.value}
            >
              {option.label}
              <span className="text-xs font-medium tabular-nums text-aura-text-muted">{countByCategory[option.value]}</span>
            </button>
          ))}
          </div>
        </div>

        <div className="mb-5 grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_220px_210px]">
          <label className="relative block"><span className="sr-only">Search review queue</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} aria-hidden="true" /><Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidates or roles" /></label>
          <label><span className="sr-only">Job opening</span><select className={selectClass} value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="ALL">All job openings</option>{state.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
          <label><span className="sr-only">Confidence level</span><select className={selectClass} value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceFilter)}><option value="ALL">All confidence levels</option><option value="BELOW_60">Below 60%</option><option value="60_74">60%–74%</option><option value="75_89">75%–89%</option><option value="90_PLUS">90% and above</option></select></label>
        </div>

        {invalidTarget ? <div className="mb-4 border-l-2 border-aura-warning bg-white px-4 py-3 text-sm text-depth shadow-aura-xs" role="status">This application is no longer in the review queue.</div> : null}

        {filteredItems.length > 0 ? (
          <><div className="hidden xl:block"><HumanReviewTable items={filteredItems} showCategory={category === 'ALL'} onReview={openReview} /></div><div className="grid gap-2 xl:hidden">{filteredItems.map((item) => <HumanReviewCard key={item.application.id} item={item} showCategory={category === 'ALL'} onReview={() => openReview(item.application.id)} />)}</div></>
        ) : (
          <p className="m-0 border-b border-harbor/10 py-5 text-sm text-aura-text-muted">{emptyTitle}.</p>
        )}
      </div>

      <Dialog open={Boolean(selectedItem)} title="Review candidate" size="wide" onClose={closeReview}>
        {selectedItem ? <HumanReviewWorkspace item={selectedItem} openOverrideOnMount={requestedAction === 'override'} /> : null}
      </Dialog>
    </PageContainer>
  )
}

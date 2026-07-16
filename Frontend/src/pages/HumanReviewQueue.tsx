import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HumanReviewCard } from '../components/reviews/HumanReviewCard'
import { HumanReviewTable } from '../components/reviews/HumanReviewTable'
import { HumanReviewWorkspace } from '../components/reviews/HumanReviewWorkspace'
import { PageContainer } from '../components/layout/PageContainer'
import { Card } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { useDemoStore } from '../hooks/useDemoStore'
import {
  selectHumanReviewQueueItem,
  selectHumanReviewQueueItems,
  selectHumanReviewQueueSummary,
} from '../store/demoSelectors'
import type { HumanReviewCategory } from '../types/reviewQueue'

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
  const { state } = useDemoStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedApplicationId = searchParams.get('applicationId')
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
  const [emptyTitle, emptyDescription] = emptyState(category)

  function openReview(applicationId: string) {
    setSelectedApplicationId(applicationId)
    const next = new URLSearchParams(searchParams)
    next.set('applicationId', applicationId)
    setSearchParams(next)
  }

  function closeReview() {
    setSelectedApplicationId(undefined)
    const next = new URLSearchParams(searchParams)
    next.delete('applicationId')
    setSearchParams(next)
  }

  return (
    <PageContainer
      eyebrow="Selection review"
      title="Human review queue"
      description="Review AI-assisted screening recommendations, resolve uncertain cases, and prepare candidates for the next hiring stage."
    >
      <Card className="mb-4 overflow-hidden p-2">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-6" role="group" aria-label="Review categories">
          {categoryOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setCategory(option.value)}
              className={`rounded-aura-sm px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier ${category === option.value ? option.value === 'NEEDS_REVIEW' ? 'bg-aura-warning-soft text-depth' : 'bg-harbor text-white' : 'bg-transparent text-aura-text-secondary hover:bg-frost'}`}
              aria-pressed={category === option.value}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide opacity-70">{option.label}</span>
              <span className="mt-1 block text-xl font-bold">{countByCategory[option.value]}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_210px_210px]">
          <label className="relative block"><span className="sr-only">Search review queue</span><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} aria-hidden="true" /><Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidates or roles" /></label>
          <label><span className="sr-only">Category</span><select className={selectClass} value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.value === 'ALL' ? 'All categories' : option.label}</option>)}</select></label>
          <label><span className="sr-only">Job opening</span><select className={selectClass} value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="ALL">All job openings</option>{state.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
          <label><span className="sr-only">Confidence level</span><select className={selectClass} value={confidence} onChange={(event) => setConfidence(event.target.value as ConfidenceFilter)}><option value="ALL">All confidence levels</option><option value="BELOW_60">Below 60%</option><option value="60_74">60%–74%</option><option value="75_89">75%–89%</option><option value="90_PLUS">90% and above</option></select></label>
        </div>
        <p className="mb-0 mt-3 text-xs font-medium text-aura-text-muted">Showing {filteredItems.length} of {items.length} review item{items.length === 1 ? '' : 's'}</p>
      </Card>

      {invalidTarget ? <div role="status"><Card className="mb-4 border-aura-warning/25 p-4 text-sm text-aura-text-secondary">The requested application is not available in the human review queue.</Card></div> : null}

      {filteredItems.length > 0 ? (
        <><div className="hidden xl:block"><HumanReviewTable items={filteredItems} onReview={openReview} /></div><div className="grid gap-3 xl:hidden">{filteredItems.map((item) => <HumanReviewCard key={item.application.id} item={item} onReview={() => openReview(item.application.id)} />)}</div></>
      ) : (
        <Card className="p-8 text-center md:p-12"><h2 className="m-0 text-lg font-semibold text-depth">{emptyTitle}</h2><p className="mx-auto mb-0 mt-2 max-w-xl text-sm leading-6 text-aura-text-secondary">{emptyDescription}</p></Card>
      )}

      <Dialog open={Boolean(selectedItem)} title="Human review workspace" size="wide" onClose={closeReview}>
        {selectedItem ? <HumanReviewWorkspace item={selectedItem} /> : null}
      </Dialog>
    </PageContainer>
  )
}

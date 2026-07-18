import { RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useDemoStore } from '../../hooks/useDemoStore'
import { getRecruiterScreenings } from '../../services/backendRecruiterApi'
import { ApiError } from '../../services/api'
import { selectCandidateListItems } from '../../store/demoSelectors'
import type { RecruiterScreeningListItem } from '../../types/backendScreening'
import { formatDateTime } from '../../utils/helpers'
import { getScreeningRecommendationLabel } from '../../utils/recommendation'

const pageSize = 10
const selectClass = 'h-10 rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'

type BackendCandidateRow = RecruiterScreeningListItem & {
  source: 'BACKEND' | 'DEMO'
  detail_path: string
  stack_order: number
}

function badgeTone(value: string | null | undefined) {
  if (value === 'ADVANCE' || value === 'STRONG_YES' || value === 'YES' || value === 'COMPLETED') return 'success'
  if (value === 'HOLD_FOR_REVIEW' || value === 'INSUFFICIENT_EVIDENCE' || value === 'REVIEW' || value === 'QUEUED' || value === 'PROCESSING') return 'warning'
  if (value === 'DO_NOT_ADVANCE' || value === 'NO' || value === 'STRONG_NO' || value === 'FAILED') return 'danger'
  return 'neutral'
}

function screeningStatusLabel(status: string | null) {
  if (status === 'COMPLETED') return 'Screening completed'
  if (status === 'FAILED') return 'Screening failed'
  if (status === 'PROCESSING') return 'Processing'
  if (status === 'QUEUED') return 'Queued'
  return 'Not screened'
}

function recommendationLabel(recommendation: string | null) {
  if (!recommendation) return '—'
  if (recommendation === 'ADVANCE') return 'Shortlist'
  if (recommendation === 'HOLD_FOR_REVIEW') return 'Needs review'
  if (recommendation === 'DO_NOT_ADVANCE') return 'Not recommended'
  if (recommendation === 'INSUFFICIENT_EVIDENCE') return 'Insufficient evidence'
  if (recommendation === 'STRONG_YES' || recommendation === 'YES' || recommendation === 'REVIEW' || recommendation === 'NO' || recommendation === 'STRONG_NO') {
    return recommendation === 'REVIEW' ? 'Needs review' : getScreeningRecommendationLabel(recommendation)
  }
  return recommendation.replaceAll('_', ' ').toLocaleLowerCase()
}

function candidateStageLabel(item: BackendCandidateRow) {
  if (item.screening_status === 'FAILED') return 'Screening failed'
  if (item.screening_status === 'QUEUED' || item.screening_status === 'PROCESSING') return 'AI screening'
  if (item.recommendation === 'ADVANCE' || item.recommendation === 'STRONG_YES' || item.recommendation === 'YES') return 'Shortlisted'
  if (item.recommendation === 'DO_NOT_ADVANCE' || item.recommendation === 'NO' || item.recommendation === 'STRONG_NO') return 'Not recommended'
  if (item.recommendation === 'HOLD_FOR_REVIEW' || item.recommendation === 'INSUFFICIENT_EVIDENCE' || item.recommendation === 'REVIEW' || item.requires_human_review) return 'Review needed'
  return item.submission_status === 'SUBMITTED' ? 'Applied' : item.submission_status.replaceAll('_', ' ').toLocaleLowerCase()
}

function candidateActionLabel(item: BackendCandidateRow) {
  if (item.requires_human_review) return 'Review screening'
  if (item.screening_status === 'COMPLETED') return 'View result'
  if (item.screening_status === 'FAILED') return 'View failure'
  return 'View candidate'
}

function candidateActionPath(item: BackendCandidateRow) {
  if (item.source === 'BACKEND' && item.requires_human_review) {
    return `${item.detail_path}?panel=human-review`
  }
  return item.detail_path
}

export default function BackendCandidatesList() {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const { state } = useDemoStore()
  const [items, setItems] = useState<RecruiterScreeningListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [recommendation, setRecommendation] = useState('ALL')
  const [screeningStatus, setScreeningStatus] = useState('ALL')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      setError('')
      const nextItems = await getRecruiterScreenings({
        ...(jobId ? { job_id: jobId } : {}),
        ...(screeningStatus !== 'ALL' ? { screening_status: screeningStatus } : {}),
        ...(recommendation !== 'ALL' ? { recommendation } : {}),
      })
      setItems(nextItems)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError('Sign in to view candidates.')
        return
      }
      setError(caught instanceof Error ? caught.message : 'Could not load candidates.')
    } finally {
      setLoading(false)
    }
  }, [jobId, recommendation, screeningStatus])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  const demoStackOrder = useMemo(() => new Map(state.applications.map((application, index) => [application.id, state.applications.length - index])), [state.applications])
  const demoRows = useMemo<BackendCandidateRow[]>(() => selectCandidateListItems(state, jobId).map((item) => ({
    application_id: item.application.id,
    screening_run_id: item.screeningEvaluation?.id ?? null,
    job_id: item.job.id,
    candidate_name: item.candidate.fullName,
    candidate_email: item.candidate.email,
    job_title: item.job.title,
    submission_status: item.application.status,
    screening_status: item.screeningStatus === 'NOT_SCREENED' || item.screeningStatus === 'SETUP_REQUIRED' ? null : item.screeningStatus,
    recommendation: item.decision?.humanRecommendation ?? item.screeningEvaluation?.recommendation ?? null,
    weighted_score: item.screeningEvaluation?.overallScore ?? null,
    assessed_coverage: item.screeningEvaluation ? 100 : null,
    submitted_at: item.application.submittedAt,
    completed_at: item.screeningEvaluation?.createdAt ?? null,
    requires_human_review: Boolean(item.screeningEvaluation && !item.decision),
    source: 'DEMO',
    detail_path: `/candidates/${item.candidate.id}`,
    stack_order: demoStackOrder.get(item.application.id) ?? 0,
  })), [demoStackOrder, jobId, state])

  const rows = useMemo<BackendCandidateRow[]>(() => [
    ...items.map((item, index) => ({
      ...item,
      source: 'BACKEND' as const,
      detail_path: `/candidates/${item.application_id}`,
      stack_order: items.length - index,
    })),
    ...demoRows,
  ].sort((left, right) => {
    const submittedDifference = new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime()
    if (submittedDifference !== 0) return submittedDifference
    return right.stack_order - left.stack_order
  }), [demoRows, items])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return rows
    return rows.filter((item) => [
      item.candidate_name,
      item.candidate_email,
      item.job_title,
      item.recommendation ?? '',
      candidateStageLabel(item),
    ].join(' ').toLocaleLowerCase().includes(term))
  }, [rows, search])

  useEffect(() => {
    setPage(1)
  }, [search, recommendation, screeningStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const visibleItems = filtered.slice(pageStart, pageStart + pageSize)

  return (
    <PageContainer title="Candidates" hideHeader>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-[28px] font-bold tracking-[-0.025em] text-depth md:text-[32px]">Candidates</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>
            {error.includes('Sign in') ? <Button onClick={() => navigate('/login')}>Sign in</Button> : null}
          </div>
        </div>

        <div className="mb-4">
          <div className="grid gap-2 md:grid-cols-[minmax(280px,1fr)_220px_220px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} />
              <Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, email, or role" />
            </label>
            <select className={selectClass} value={recommendation} onChange={(event) => setRecommendation(event.target.value)}>
              <option value="ALL">All AI results</option>
              <option value="ADVANCE">Shortlist</option>
              <option value="HOLD_FOR_REVIEW">Needs review</option>
              <option value="DO_NOT_ADVANCE">Not recommended</option>
              <option value="INSUFFICIENT_EVIDENCE">Insufficient evidence</option>
            </select>
            <select className={selectClass} value={screeningStatus} onChange={(event) => setScreeningStatus(event.target.value)}>
              <option value="ALL">All screening statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {error ? <Card className="mb-4 border-aura-danger/25 bg-aura-danger-soft p-4 text-sm font-medium text-aura-danger">{error}</Card> : null}
        {loading ? <Card className="p-8 text-center text-sm text-aura-text-muted">Loading candidates…</Card> : null}
        {!loading && filtered.length === 0 && !error ? <Card className="p-8 text-center text-sm text-aura-text-muted">No candidates found.</Card> : null}

        {filtered.length > 0 ? (
          <div className="overflow-hidden rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs">
            <table className="w-full table-fixed border-collapse text-left text-sm">
              <thead className="bg-frost/80 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-text-muted">
                <tr>
                  <th className="w-[24%] px-4 py-3">Candidate</th>
                  <th className="w-[20%] px-4 py-3">Role</th>
                  <th className="w-[20%] px-4 py-3">Screening</th>
                  <th className="w-[20%] px-4 py-3">AI result</th>
                  <th className="w-[16%] px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-harbor/10">
                {visibleItems.map((item) => (
                  <tr className="transition-colors hover:bg-glacier/[0.07]" key={item.application_id}>
                    <td className="px-4 py-4 align-middle">
                      <Link className="block truncate font-semibold text-depth no-underline hover:text-marine" to={item.detail_path}>{item.candidate_name}</Link>
                      <span className="mt-0.5 block truncate text-xs text-aura-text-muted">{item.candidate_email}</span>
                      <span className="mt-0.5 block text-xs text-aura-text-muted">{formatDateTime(item.submitted_at)}</span>
                    </td>
                    <td className="px-4 py-4 align-middle font-medium text-depth">{item.job_title}</td>
                    <td className="px-4 py-4 align-middle">
                      <Badge tone={badgeTone(item.screening_status)}>{screeningStatusLabel(item.screening_status)}</Badge>
                      <p className="mb-0 mt-1.5 text-xs font-semibold text-depth">{candidateStageLabel(item)}</p>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <Badge tone={badgeTone(item.recommendation)}>{recommendationLabel(item.recommendation)}</Badge>
                      {item.weighted_score !== null ? <p className="mb-0 mt-1.5 text-xs font-semibold text-depth">{Math.round(item.weighted_score)} / 100</p> : null}
                    </td>
                    <td className="px-4 py-4 text-right align-middle">
                      <Link className="text-sm font-semibold text-harbor no-underline hover:text-depth" to={candidateActionPath(item)}>{candidateActionLabel(item)}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-harbor/10 px-5 py-4 text-sm text-aura-text-muted">
              <span>Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                <span className="min-w-20 text-center font-semibold text-depth">Page {safePage} / {totalPages}</span>
                <Button variant="secondary" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageContainer>
  )
}

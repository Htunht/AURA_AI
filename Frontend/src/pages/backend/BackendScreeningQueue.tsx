import { RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../services/api'
import { getRecruiterScreenings, retryRecruiterScreening } from '../../services/backendRecruiterApi'
import type { RecruiterScreeningListItem } from '../../types/backendScreening'
import { formatDateTime } from '../../utils/helpers'

const activeStatuses = new Set(['QUEUED', 'PROCESSING'])
const selectClass = 'h-10 rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'

function statusTone(status: string | null) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PROCESSING' || status === 'QUEUED') return 'accent'
  return 'neutral'
}

function formatBackendStatus(value: string | null) {
  return value ? value.replaceAll('_', ' ').toLocaleLowerCase() : 'Not started'
}

function rowAction(item: RecruiterScreeningListItem) {
  if (item.screening_status === 'FAILED') return 'View failure'
  if (item.screening_status === 'COMPLETED') return item.requires_human_review ? 'Review now' : 'View screening'
  return 'View progress'
}

export default function BackendScreeningQueue() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RecruiterScreeningListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [retrying, setRetrying] = useState<string>()

  async function load() {
    try {
      setError('')
      const nextItems = await getRecruiterScreenings(status === 'ALL' ? undefined : { screening_status: status })
      setItems(nextItems)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError('Sign in to view backend screening runs.')
        return
      }
      setError(caught instanceof Error ? caught.message : 'Could not load screening queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    void load()
  }, [status])

  useEffect(() => {
    if (!items.some((item) => activeStatuses.has(item.screening_status ?? ''))) return
    const interval = window.setInterval(() => void load(), 3000)
    return () => window.clearInterval(interval)
  }, [items, status])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    if (!term) return items
    return items.filter((item) => [item.candidate_name, item.candidate_email, item.job_title, item.recommendation ?? ''].join(' ').toLocaleLowerCase().includes(term))
  }, [items, search])

  async function retry(applicationId: string) {
    setRetrying(applicationId)
    try {
      await retryRecruiterScreening(applicationId)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Retry failed.')
    } finally {
      setRetrying(undefined)
    }
  }

  return (
    <PageContainer title="Screening queue" hideHeader>
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-[28px] font-bold tracking-[-0.025em] text-depth md:text-[32px]">Screening queue</h1>
            <p className="mb-0 mt-1 text-sm text-aura-text-muted">Backend mode · PostgreSQL screening runs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>
            {error.includes('Sign in') ? <Button onClick={() => navigate('/login')}>Sign in</Button> : null}
          </div>
        </div>

        <Card className="mb-4 p-3">
          <div className="flex flex-wrap gap-2">
            <label className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aura-text-muted" size={17} />
              <Input className="h-10 pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidate, email, or role" />
            </label>
            <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="QUEUED">Queued</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </Card>

        {error ? <Card className="mb-4 border-aura-danger/25 bg-aura-danger-soft p-4 text-sm font-medium text-aura-danger">{error}</Card> : null}
        {loading ? <Card className="p-8 text-center text-sm text-aura-text-muted">Loading backend screening runs…</Card> : null}

        {!loading && filtered.length === 0 && !error ? <Card className="p-8 text-center text-sm text-aura-text-muted">No backend screening runs found.</Card> : null}

        {filtered.length > 0 ? (
          <div className="overflow-hidden rounded-aura-md bg-white shadow-aura-xs">
            <div className="grid grid-cols-[1.1fr_1fr_150px_150px_190px] gap-4 border-b border-harbor/10 bg-frost/70 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted">
              <span>Candidate</span><span>Job</span><span>Status</span><span>Score</span><span>Action</span>
            </div>
            {filtered.map((item) => (
              <div className="grid grid-cols-[1.1fr_1fr_150px_150px_190px] items-center gap-4 border-b border-harbor/10 px-5 py-4 last:border-0" key={item.application_id}>
                <div>
                  <p className="m-0 font-semibold text-depth">{item.candidate_name}</p>
                  <p className="mb-0 mt-1 text-xs text-aura-text-muted">{item.candidate_email}</p>
                  <p className="mb-0 mt-1 text-xs text-aura-text-muted">{formatDateTime(item.submitted_at)}</p>
                </div>
                <div className="text-sm font-medium text-depth">{item.job_title}</div>
                <div><Badge tone={statusTone(item.screening_status)}>{formatBackendStatus(item.screening_status)}</Badge>{item.requires_human_review ? <p className="mb-0 mt-1 text-xs font-semibold text-aura-warning">Human review</p> : null}</div>
                <div className="text-sm font-semibold text-depth">{item.weighted_score === null ? 'Unavailable' : `${Math.round(item.weighted_score)} / 100`}<p className="mb-0 mt-1 text-xs font-medium text-aura-text-muted">{item.assessed_coverage === null ? 'Coverage unavailable' : `${item.assessed_coverage}% coverage`}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Link className="text-sm font-semibold text-harbor no-underline hover:text-depth" to={`/candidates/${item.application_id}`}>{rowAction(item)}</Link>
                  {item.screening_status === 'FAILED' ? <button className="border-0 bg-transparent p-0 text-sm font-semibold text-harbor hover:text-depth" disabled={retrying === item.application_id} onClick={() => void retry(item.application_id)} type="button">{retrying === item.application_id ? 'Retrying…' : 'Retry'}</button> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </PageContainer>
  )
}


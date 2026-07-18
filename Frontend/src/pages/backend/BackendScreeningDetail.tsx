import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ApiError } from '../../services/api'
import { getRecruiterScreeningDetail, retryRecruiterScreening, submitHumanScreeningReview } from '../../services/backendRecruiterApi'
import type { HumanScreeningReviewPayload, RecruiterScreeningDetail } from '../../types/backendScreening'
import { isBackendUuid, isDemoId } from '../../utils/backendIds'
import { formatDateTime } from '../../utils/helpers'

const activeStatuses = new Set(['QUEUED', 'PROCESSING'])
const actions: Array<{ value: HumanScreeningReviewPayload['action']; label: string; override?: boolean }> = [
  { value: 'CONFIRM_ADVANCE', label: 'Confirm advance' },
  { value: 'CONFIRM_HOLD', label: 'Confirm hold' },
  { value: 'CONFIRM_DO_NOT_ADVANCE', label: 'Confirm do not advance' },
  { value: 'OVERRIDE_TO_ADVANCE', label: 'Override to advance', override: true },
  { value: 'OVERRIDE_TO_HOLD', label: 'Override to hold', override: true },
  { value: 'OVERRIDE_TO_DO_NOT_ADVANCE', label: 'Override to do not advance', override: true },
  { value: 'REQUEST_MORE_EVIDENCE', label: 'Request more evidence' },
]

function statusTone(status: string | null) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'QUEUED' || status === 'PROCESSING') return 'accent'
  return 'neutral'
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ').toLocaleLowerCase() : 'Unavailable'
}

function sourceTone(source: string) {
  if (source === 'GITHUB') return 'accent'
  if (source === 'CV') return 'success'
  if (source === 'APPLICATION_FORM') return 'neutral'
  return 'warning'
}

export default function BackendScreeningDetail({ applicationId }: { applicationId: string }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [detail, setDetail] = useState<RecruiterScreeningDetail>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const [reviewAction, setReviewAction] = useState<HumanScreeningReviewPayload['action']>('CONFIRM_HOLD')
  const [overrideReason, setOverrideReason] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')

  const invalidBackendId = isDemoId(applicationId) || !isBackendUuid(applicationId)
  const selectedAction = actions.find((item) => item.value === reviewAction)
  const requestedPanel = searchParams.get('panel')
  const humanReviewPanelRef = useRef<HTMLElement | null>(null)

  async function load() {
    if (invalidBackendId) return
    try {
      setError('')
      setDetail(await getRecruiterScreeningDetail(applicationId))
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError('Sign in to view this backend screening run.')
        return
      }
      setError(caught instanceof Error ? caught.message : 'Could not load screening detail.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(!invalidBackendId)
    void load()
  }, [applicationId, invalidBackendId])

  useEffect(() => {
    if (!detail || !activeStatuses.has(detail.screening_status ?? '')) return
    const interval = window.setInterval(() => void load(), 3000)
    return () => window.clearInterval(interval)
  }, [detail?.screening_status, applicationId])

  useEffect(() => {
    if (requestedPanel !== 'human-review' || !detail || detail.screening_status !== 'COMPLETED') return
    window.setTimeout(() => {
      humanReviewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      humanReviewPanelRef.current?.focus({ preventScroll: true })
    }, 0)
  }, [detail, requestedPanel])

  const referencesByCriterion = useMemo(() => {
    const map = new Map<string, RecruiterScreeningDetail['evidence_references']>()
    for (const reference of detail?.evidence_references ?? []) {
      map.set(reference.criterion_key, [...(map.get(reference.criterion_key) ?? []), reference])
    }
    return map
  }, [detail])

  async function retry() {
    setRetrying(true)
    setError('')
    try {
      await retryRecruiterScreening(applicationId)
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Retry failed.')
    } finally {
      setRetrying(false)
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedAction?.override && !overrideReason.trim()) {
      setReviewMessage('Override actions require a reason.')
      return
    }
    try {
      setReviewMessage('')
      await submitHumanScreeningReview(applicationId, {
        action: reviewAction,
        ...(selectedAction?.override ? { override_reason: overrideReason.trim() } : {}),
        ...(reviewNotes.trim() ? { reviewer_notes: reviewNotes.trim() } : {}),
      })
      setReviewMessage('Human review recorded.')
      await load()
    } catch (caught) {
      setReviewMessage(caught instanceof Error ? caught.message : 'Review could not be recorded.')
    }
  }

  if (invalidBackendId) {
    return <PageContainer title="Backend application required" actions={<Link className="text-sm font-semibold text-harbor" to="/candidates"><ArrowLeft size={16} />Back to queue</Link>}><Card className="p-6 text-sm text-aura-text-secondary">Backend mode expects a real application UUID. Demo IDs such as <code>candidate-demo-006</code> remain demo-only.</Card></PageContainer>
  }

  return (
    <PageContainer title="Screening detail" hideHeader>
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-harbor no-underline" to="/candidates"><ArrowLeft size={16} />Back to queue</Link>
            <h1 className="m-0 text-[28px] font-bold tracking-[-0.025em] text-depth md:text-[32px]">{detail?.candidate.full_name ?? 'Backend screening'}</h1>
            <p className="mb-0 mt-1 text-sm text-aura-text-muted">{detail?.job.title ?? applicationId}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button>
            {error.includes('Sign in') ? <Button onClick={() => navigate('/login')}>Sign in</Button> : null}
          </div>
        </div>

        {error ? <Card className="mb-4 border-aura-danger/25 bg-aura-danger-soft p-4 text-sm font-medium text-aura-danger">{error}</Card> : null}
        {loading ? <Card className="p-8 text-center text-sm text-aura-text-muted">Loading real screening detail…</Card> : null}
        {!loading && detail ? (
          <div className="grid gap-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge tone={statusTone(detail.screening_status)}>{label(detail.screening_status)}</Badge>
                  <h2 className="mb-0 mt-3 text-xl font-semibold text-depth">AI screening is advisory</h2>
                  <p className="mb-0 mt-1 text-sm text-aura-text-secondary">A human reviewer makes the shortlist decision.</p>
                </div>
                <dl className="grid min-w-80 gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-aura-text-muted">Score</dt><dd className="mb-0 mt-1 font-semibold text-depth">{detail.weighted_score === null ? 'Unavailable' : `${Math.round(detail.weighted_score)} / 100`}</dd></div>
                  <div><dt className="text-xs text-aura-text-muted">Coverage</dt><dd className="mb-0 mt-1 font-semibold text-depth">{detail.assessed_coverage === null ? 'Unavailable' : `${detail.assessed_coverage}%`}</dd></div>
                  <div><dt className="text-xs text-aura-text-muted">Recommendation</dt><dd className="mb-0 mt-1 font-semibold text-depth">{label(detail.recommendation)}</dd></div>
                </dl>
              </div>
              {detail.weighted_score === null ? <p className="mb-0 mt-4 rounded-aura-sm bg-frost px-3 py-2 text-sm text-aura-text-secondary">Score unavailable due to insufficient assessed evidence.</p> : null}
            </Card>

            {activeStatuses.has(detail.screening_status ?? '') ? (
              <Card className="p-5">
                <h2 className="m-0 text-lg font-semibold text-depth">Automatic screening is running</h2>
                <ol className="mt-4 grid gap-2 p-0 text-sm text-aura-text-secondary md:grid-cols-3">
                  {['Application received', 'CV extraction', 'GitHub repository analysis', 'AI evidence assessment', 'Python scoring', 'Result persistence'].map((step) => <li className="rounded-aura-sm border border-harbor/10 bg-frost/55 px-3 py-2" key={step}>{step}</li>)}
                </ol>
              </Card>
            ) : null}

            {detail.screening_status === 'FAILED' ? (
              <Card className="border-aura-danger/25 p-5">
                <h2 className="m-0 text-lg font-semibold text-depth">Screening failed</h2>
                <p className="mb-0 mt-2 text-sm text-aura-text-secondary">{detail.safe_error_detail ?? 'Automated screening could not be completed.'}</p>
                {detail.error_code ? <p className="mb-0 mt-2 font-mono text-xs text-aura-text-muted">{detail.error_code}</p> : null}
                <Button className="mt-4" disabled={retrying} onClick={() => void retry()}><RotateCcw size={15} />{retrying ? 'Retrying…' : 'Retry screening'}</Button>
              </Card>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <section className="grid gap-3">
                {detail.criterion_results.map((criterion) => {
                  const references = referencesByCriterion.get(criterion.criterion_key) ?? []
                  return (
                    <Card className="p-5" key={criterion.criterion_key}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="m-0 text-base font-semibold text-depth">{criterion.criterion_key.replaceAll('_', ' ')}</h3>
                          <p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">{criterion.evidence_summary}</p>
                        </div>
                        <div className="text-right text-sm font-semibold text-depth">{criterion.normalized_score === null ? 'Unavailable' : `${criterion.normalized_score}/100`}<p className="mb-0 mt-1 text-xs text-aura-text-muted">Weight {criterion.weight}%</p></div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">{references.map((reference) => <span className="inline-flex items-center gap-1 rounded-full bg-frost px-2.5 py-1 text-xs font-semibold text-harbor" key={`${reference.criterion_key}-${reference.evidence_id}`}><Badge tone={sourceTone(reference.source_type)}>{reference.source_type === 'APPLICATION_FORM' ? 'Form' : reference.source_type}</Badge>{reference.explanation}</span>)}</div>
                      {criterion.missing_evidence.length ? <p className="mb-0 mt-3 text-xs text-aura-warning">Missing: {criterion.missing_evidence.join('; ')}</p> : null}
                    </Card>
                  )
                })}
              </section>

              <aside className="grid content-start gap-4">
                <Card className="p-5">
                  <h2 className="m-0 text-base font-semibold text-depth">Evidence quality</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div><dt className="text-xs text-aura-text-muted">CV extraction</dt><dd className="mb-0 mt-1 font-semibold text-depth">{label(detail.cv_extraction_status)}</dd></div>
                    <div><dt className="text-xs text-aura-text-muted">GitHub</dt><dd className="mb-0 mt-1 font-semibold text-depth">{detail.github_repository_url ? label(String(detail.github_analysis?.analysis_status ?? 'pending')) : 'Not supplied'}</dd></div>
                    <div><dt className="text-xs text-aura-text-muted">Submitted</dt><dd className="mb-0 mt-1 font-semibold text-depth">{formatDateTime(detail.submitted_at)}</dd></div>
                  </dl>
                </Card>
                {[...detail.data_quality_warnings, ...((detail.github_analysis?.warnings as string[] | undefined) ?? [])].length ? <Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Warnings</h2><ul className="mb-0 mt-3 grid gap-2 pl-5 text-sm text-aura-text-secondary">{[...detail.data_quality_warnings, ...((detail.github_analysis?.warnings as string[] | undefined) ?? [])].map((warning) => <li key={warning}>{warning}</li>)}</ul></Card> : null}
                {detail.screening_status === 'COMPLETED' ? (
                  <section
                    ref={humanReviewPanelRef}
                    tabIndex={-1}
                    className="rounded-aura-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier"
                    aria-label="Human screening review"
                  >
                  <Card className={`p-5 ${requestedPanel === 'human-review' ? 'border-marine/35 shadow-[0_0_0_3px_rgba(114,163,191,0.18)]' : ''}`}>
                    <h2 className="m-0 text-base font-semibold text-depth">Human review</h2>
                    <form className="mt-4 grid gap-3" onSubmit={submitReview}>
                      <label className="grid gap-1.5 text-sm font-semibold text-depth">Decision<select className="h-10 rounded-aura-sm border border-harbor/20 px-3 text-sm" value={reviewAction} onChange={(event) => setReviewAction(event.target.value as HumanScreeningReviewPayload['action'])}>{actions.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}</select></label>
                      {selectedAction?.override ? <label className="grid gap-1.5 text-sm font-semibold text-depth">Override reason<textarea className="min-h-20 rounded-aura-sm border border-harbor/20 px-3 py-2 text-sm" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} /></label> : null}
                      <label className="grid gap-1.5 text-sm font-semibold text-depth">Notes<textarea className="min-h-20 rounded-aura-sm border border-harbor/20 px-3 py-2 text-sm" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} /></label>
                      {reviewMessage ? <p className="m-0 text-sm font-semibold text-harbor">{reviewMessage}</p> : null}
                      <Button type="submit">Record human review</Button>
                    </form>
                    {detail.human_reviews.length ? <div className="mt-4 border-t border-harbor/10 pt-3"><p className="m-0 text-xs font-bold uppercase tracking-wide text-aura-text-muted">History</p>{detail.human_reviews.map((review) => <p className="mb-0 mt-2 text-sm text-aura-text-secondary" key={review.id}>{label(review.action)} · {formatDateTime(review.created_at)}</p>)}</div> : null}
                  </Card>
                  </section>
                ) : null}
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </PageContainer>
  )
}

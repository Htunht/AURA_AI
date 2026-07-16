import { ArrowLeft, CheckCircle2, Plus, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import { useScreeningAutomation } from '../../hooks/useScreeningAutomation'
import {
  selectDraftRubricByJobId,
  selectPublishedRubricByJobId,
  selectRubricsByJobId,
} from '../../store/demoSelectors'
import type { EvaluationRubric, RubricCriterion } from '../../types/rubric'
import {
  createRubricCriterion,
  generateRubricDraft,
  validateRubricDraft,
} from '../../utils/rubricBuilder'

const fieldClass = 'w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'
const backClass = 'inline-flex h-10 items-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline hover:bg-glacier/15 focus-visible:ring-2 focus-visible:ring-glacier'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-depth">{label}{children}{error ? <span className="text-xs font-normal text-aura-danger">{error}</span> : null}</label>
}

function RubricSnapshot({ rubric }: { rubric: EvaluationRubric }) {
  return <Card className="p-5 md:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-depth">Published version {rubric.version}</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">This version is read-only and is used for automated screening.</p></div><Badge tone="success">Published</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-2">{rubric.criteria.map((criterion) => <div className="rounded-aura-sm border border-harbor/10 bg-frost/55 p-4" key={criterion.key}><div className="flex justify-between gap-3"><h3 className="m-0 text-sm font-semibold text-depth">{criterion.name}</h3><span className="text-sm font-bold text-harbor">{criterion.weight}%</span></div><p className="mb-0 mt-2 text-xs leading-5 text-aura-text-secondary">{criterion.description}</p></div>)}</div></Card>
}

export default function ScreeningRubricEditor() {
  const { jobId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const { retryFailed } = useScreeningAutomation()
  const job = state.jobs.find((item) => item.id === jobId)
  const draft = selectDraftRubricByJobId(state, jobId)
  const published = selectPublishedRubricByJobId(state, jobId)
  const rubrics = selectRubricsByJobId(state, jobId)

  if (!job) return <PageContainer eyebrow="AI screening setup" title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening could not be resolved.</Card></PageContainer>

  function createDraft() {
    dispatch({ type: 'ADD_RUBRIC', payload: { rubric: generateRubricDraft(job!, rubrics, new Date().toISOString()) } })
  }

  return <PageContainer eyebrow="Advanced screening settings" title={`${job.title} screening settings`} description="Advanced access to weighted evaluation categories. Use the guided hiring workflow for normal setup." actions={<Link className={backClass} to={`/jobs/${job.id}/setup?step=screening`}><ArrowLeft size={16} />Screening rules</Link>}>
    {draft ? <RubricForm key={draft.id} initialRubric={draft} /> : <div className="grid gap-4"><Card className="p-5 md:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-aura-sm bg-glacier/20 text-harbor"><Scale size={19} /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="m-0 text-lg font-semibold text-depth">{published ? 'Screening rubric is active' : 'Screening setup required'}</h2>{published ? <Badge tone="success">Ready</Badge> : <Badge tone="warning">Required</Badge>}</div><p className="mb-0 mt-1 max-w-2xl text-sm leading-6 text-aura-text-secondary">{published ? 'Create a draft version to safely refine the criteria. Screening continues with the published version until the draft is published.' : 'Generate a role-aware starting rubric, review its evidence criteria, then publish it to start automatic screening.'}</p></div></div><Button onClick={createDraft}>{published ? 'Create draft version' : 'Generate draft rubric'}</Button></div></Card>{published ? <RubricSnapshot rubric={published} /> : null}</div>}
  </PageContainer>

  function RubricForm({ initialRubric }: { initialRubric: EvaluationRubric }) {
    const [form, setForm] = useState(initialRubric)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saved, setSaved] = useState(false)
    const totalWeight = form.criteria.reduce((sum, criterion) => sum + criterion.weight, 0)

    function updateCriterion(index: number, changes: Partial<RubricCriterion>) {
      setForm((current) => ({ ...current, criteria: current.criteria.map((criterion, criterionIndex) => criterionIndex === index ? { ...criterion, ...changes } : criterion) }))
      setSaved(false)
    }

    function persist(publish: boolean) {
      const updated = { ...form, updatedAt: new Date().toISOString() }
      const validation = validateRubricDraft(updated)
      setErrors(validation.errors)
      if (!validation.valid) return
      dispatch({ type: 'UPDATE_RUBRIC', payload: { rubric: updated } })
      if (publish) {
        dispatch({ type: 'PUBLISH_RUBRIC', payload: { rubricId: updated.id, updatedAt: updated.updatedAt } })
        const failedForJob = state.screeningQueue.filter((item) => item.status === 'FAILED' && state.applications.some((application) => application.id === item.applicationId && application.jobId === job!.id)).map((item) => item.applicationId)
        if (failedForJob.length > 0) retryFailed(failedForJob)
      } else {
        setForm(updated)
        setSaved(true)
      }
    }

    return <div className="grid gap-4"><Card className="border-marine/20 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="m-0 text-lg font-semibold text-depth">Draft version {form.version}</h2><Badge tone="accent">Draft</Badge></div><p className="mb-0 mt-1 text-xs text-aura-text-muted">Changes do not affect screening until this version is published.</p></div>{saved ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-aura-success"><CheckCircle2 size={16} />Draft saved</span> : null}</div></Card>
      <Card className="p-5 md:p-6"><Field label="Rubric name" error={errors.name}><input className={fieldClass} value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setSaved(false) }} /></Field></Card>
      <Card className="overflow-hidden"><div className="border-b border-harbor/10 p-5 md:px-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="m-0 text-lg font-semibold text-depth">Evaluation criteria</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">Make every criterion specific enough to support an evidence-backed review.</p></div><div className="min-w-48"><div className="flex items-baseline justify-between gap-4"><span className="text-xs font-semibold uppercase tracking-wide text-aura-text-muted">Rubric balance</span><span className={`text-lg font-bold ${totalWeight === 100 ? 'text-aura-success' : 'text-aura-warning'}`}>{totalWeight}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-frost"><div className={`h-full rounded-full transition-all ${totalWeight === 100 ? 'bg-aura-success' : 'bg-aura-warning'}`} style={{ width: `${Math.min(100, Math.max(0, totalWeight))}%` }} /></div>{errors.totalWeight ? <p className="mb-0 mt-1 text-xs text-aura-danger">{errors.totalWeight}</p> : null}</div></div></div>
        <div className="grid gap-0 divide-y divide-harbor/10">{form.criteria.map((criterion, index) => <section className="p-5 md:p-6" key={`${criterion.key}-${index}`}><div className="mb-4 flex items-center justify-between gap-3"><div><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-marine">Criterion {index + 1}</span><h3 className="mb-0 mt-1 text-base font-semibold text-depth">{criterion.name || 'Untitled criterion'}</h3></div><Button variant="ghost" className="px-3 text-aura-danger" disabled={form.criteria.length === 1} onClick={() => { setForm((current) => ({ ...current, criteria: current.criteria.filter((_, itemIndex) => itemIndex !== index) })); setSaved(false) }} aria-label={`Remove criterion ${index + 1}`}><Trash2 size={16} />Remove</Button></div><div className="grid gap-4 md:grid-cols-[1fr_180px]"><Field label="Criterion name" error={errors[`criteria.${index}.name`]}><input className={fieldClass} value={criterion.name} onChange={(event) => updateCriterion(index, { name: event.target.value })} /></Field><Field label="Weight" error={errors[`criteria.${index}.weight`]}><div className="relative"><input className={`${fieldClass} pr-9`} type="number" min="1" max="100" value={criterion.weight} onChange={(event) => updateCriterion(index, { weight: Number(event.target.value) })} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-aura-text-muted">%</span></div></Field></div><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Evidence description" error={errors[`criteria.${index}.description`]}><textarea className={`${fieldClass} min-h-24 resize-y`} value={criterion.description} onChange={(event) => updateCriterion(index, { description: event.target.value })} /></Field><Field label="Evaluation guidance" error={errors[`criteria.${index}.evaluationGuidance`]}><textarea className={`${fieldClass} min-h-24 resize-y`} value={criterion.evaluationGuidance} onChange={(event) => updateCriterion(index, { evaluationGuidance: event.target.value })} /></Field></div><details className="mt-4"><summary className="cursor-pointer text-xs font-semibold text-harbor">Advanced criterion key</summary><div className="mt-3 max-w-md"><Field label="Stable key" error={errors[`criteria.${index}.key`]}><input className={fieldClass} value={criterion.key} onChange={(event) => updateCriterion(index, { key: event.target.value.toLowerCase().replaceAll(' ', '_') })} /></Field></div></details></section>)}</div><div className="border-t border-harbor/10 bg-frost/35 p-4 md:px-6"><Button variant="secondary" onClick={() => { setForm((current) => ({ ...current, criteria: [...current.criteria, createRubricCriterion(current.criteria)] })); setSaved(false) }}><Plus size={16} />Add criterion</Button></div></Card>
      {Object.keys(errors).length > 0 ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft p-4 text-sm text-aura-danger" role="alert">Review the highlighted rubric fields before publishing.</p> : null}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => persist(false)}>Save draft</Button><Button onClick={() => persist(true)}>Publish rubric and start screening</Button></div>
    </div>
  }
}

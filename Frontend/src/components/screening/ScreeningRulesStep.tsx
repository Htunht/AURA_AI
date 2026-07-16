import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateScreeningRules } from '../../services/screeningRuleGeneration'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { EvaluationRubric } from '../../types/rubric'
import { deriveJobRequirements } from '../../utils/jobRequirements'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function ScreeningRulesStep({ jobId }: { jobId: string }) {
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const job = state.jobs.find((item) => item.id === jobId)
  const form = state.applicationForms.find((item) => item.jobId === jobId && item.status === 'DRAFT') ?? state.applicationForms.find((item) => item.jobId === jobId && item.status === 'PUBLISHED')
  const storedDraft = state.rubrics.find((item) => item.jobId === jobId && item.status === 'DRAFT')
  const published = state.rubrics.find((item) => item.jobId === jobId && item.status === 'PUBLISHED')
  const [rubric, setRubric] = useState<EvaluationRubric | undefined>(storedDraft ?? published)
  const [error, setError] = useState('')
  if (!job || !form) return <Card className="p-8 text-center text-sm text-aura-text-secondary">Complete the application form before reviewing screening rules.</Card>
  const requirements = deriveJobRequirements(job)
  function generate() {
    const result = generateScreeningRules({ job: job!, requirements, form: form!, previousRubric: published })
    dispatch({ type: 'ADD_RUBRIC', payload: { rubric: result.rubric } }); setRubric(result.rubric)
  }
  function save() {
    if (!rubric) return
    const total = rubric.criteria.reduce((sum, item) => sum + item.weight, 0)
    if (total !== 100) return setError(`Screening weights must total 100%. Current total: ${total}%.`)
    if (rubric.status === 'DRAFT') dispatch({ type: 'UPDATE_RUBRIC', payload: { rubric: { ...rubric, updatedAt: new Date().toISOString() } } })
    navigate(`/jobs/${jobId}/setup?step=review`)
  }
  if (!rubric) return <Card className="p-8 text-center"><h2 className="m-0 text-lg font-semibold text-depth">Prepare screening rules</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Generate readable qualification checks and evidence categories from the job requirements and application questions.</p><Button className="mt-5" onClick={generate}>Generate screening rules</Button></Card>
  const editable = rubric.status === 'DRAFT'
  const total = rubric.criteria.reduce((sum, item) => sum + item.weight, 0)
  return <div className="grid gap-4"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-depth">Qualification checks</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">Required evidence can create a recruiter-review flag. Preferred evidence is additive and never rejects by itself.</p></div><Badge tone={total === 100 ? 'success' : 'warning'}>{total}% total weight</Badge></div><div className="mt-5 grid gap-3 md:grid-cols-2">{rubric.requirementRules?.filter((rule) => rule.importance !== 'SUPPORTING').map((rule) => { const requirement = requirements.find((item) => item.id === rule.requirementId); return <article className="rounded-aura-sm border border-harbor/10 bg-frost/55 p-4" key={rule.id}><div className="flex items-start justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-depth">{requirement?.label}</h3><Badge tone={rule.importance === 'REQUIRED' ? 'warning' : 'neutral'}>{rule.importance === 'REQUIRED' ? 'Required qualification' : 'Preferred qualification'}</Badge></div><p className="mb-0 mt-3 text-xs text-aura-text-muted">Evidence: {rule.fieldKeys.length ? rule.fieldKeys.map((key) => form.fields.find((field) => field.key === key)?.label ?? key).join(', ') : 'No direct evidence question'}</p><p className="mb-0 mt-2 text-xs leading-5 text-aura-text-secondary">{rule.scoringBehavior === 'THRESHOLD' ? 'Candidates below the requirement are flagged for recruiter review.' : rule.importance === 'REQUIRED' ? 'Missing or weak evidence lowers the qualification score and adds a review flag.' : 'Evidence can improve the score; missing evidence does not reject the candidate.'}</p></article> })}</div></Card><Card className="p-5"><h2 className="m-0 text-lg font-semibold text-depth">Evaluation categories</h2><div className="mt-4 grid gap-3">{rubric.criteria.map((criterion, index) => <div className="grid gap-3 rounded-aura-sm border border-harbor/10 p-4 md:grid-cols-[1fr_120px]" key={criterion.key}><div><h3 className="m-0 text-sm font-semibold text-depth">{criterion.name}</h3><p className="mb-0 mt-1 text-xs leading-5 text-aura-text-secondary">{criterion.description}</p></div><label className="grid gap-1 text-xs font-semibold text-aura-text-muted">Weight<div className="relative"><input className="h-10 w-full rounded-aura-sm border border-harbor/20 px-3 pr-8 text-sm font-semibold text-depth" type="number" min="1" max="100" disabled={!editable} value={criterion.weight} onChange={(event) => { const value = Number(event.target.value); setRubric((current) => current ? { ...current, criteria: current.criteria.map((item, itemIndex) => itemIndex === index ? { ...item, weight: value } : item) } : current); setError('') }} /><span className="absolute right-3 top-1/2 -translate-y-1/2">%</span></div></label></div>)}</div></Card><Card className="p-5"><h2 className="m-0 text-lg font-semibold text-depth">Recommendation guidance</h2><div className="mt-3 grid gap-2 text-sm text-aura-text-secondary sm:grid-cols-2"><p className="m-0 flex gap-2"><CheckCircle2 className="shrink-0 text-aura-success" size={16} />Scores reflect mapped submitted evidence.</p><p className="m-0 flex gap-2"><AlertCircle className="shrink-0 text-aura-warning" size={16} />Missing required evidence forces recruiter review when the score would otherwise be positive.</p></div></Card>{error ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft p-4 text-sm text-aura-danger" role="alert">{error}</p> : null}<div className="flex justify-between"><Button variant="secondary" onClick={() => navigate(`/jobs/${jobId}/setup?step=form`)}>Back</Button><Button onClick={save}>{editable ? 'Save screening rules and continue' : 'Continue to review'}</Button></div></div>
}

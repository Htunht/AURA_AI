import { Eye, Lightbulb, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRecommendedApplicationForm, generateRequirementAwareQuestions, type RequirementAwareQuestionSuggestion } from '../../services/applicationQuestionGeneration'
import { generateScreeningRules } from '../../services/screeningRuleGeneration'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { ApplicationFormField } from '../../types/applicationForm'
import { createJobRequirementFingerprint, deriveJobRequirements } from '../../utils/jobRequirements'
import { AddFieldDialog } from './AddFieldDialog'
import { FormFieldList } from './FormFieldList'
import { FormPreview } from './FormPreview'
import { RequirementCoveragePanel } from './RequirementCoveragePanel'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'

export function ApplicationFormStep({ jobId }: { jobId: string }) {
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const job = state.jobs.find((item) => item.id === jobId)
  const requirements = job ? deriveJobRequirements(job) : []
  const forms = state.applicationForms.filter((item) => item.jobId === jobId).sort((a, b) => b.version - a.version)
  const draft = forms.find((item) => item.status === 'DRAFT')
  const published = forms.find((item) => item.status === 'PUBLISHED')
  const form = draft ?? published
  const [name, setName] = useState(form?.name ?? '')
  const [description, setDescription] = useState(form?.description ?? '')
  const [preview, setPreview] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApplicationFormField>()
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  useEffect(() => { if (form) { setName(form.name); setDescription(form.description ?? '') } }, [form])
  if (!job) return null

  function createInitial() { dispatch({ type: 'ADD_APPLICATION_FORM', payload: createRecommendedApplicationForm(job!, requirements, 1, new Date().toISOString()) }) }
  function createDraftVersion() {
    if (!published) return
    const timestamp = new Date().toISOString()
    const version = Math.max(...forms.map((item) => item.version)) + 1
    const baseFields = published.fields.map((field) => ({ ...field, options: field.options?.map((option) => ({ ...option })), screeningMapping: field.screeningMapping ? { ...field.screeningMapping, requirementIds: [...field.screeningMapping.requirementIds], criterionKeys: [...field.screeningMapping.criterionKeys] } : undefined }))
    const additions = generateRequirementAwareQuestions({ job: job!, requirements, existingFields: baseFields })
    dispatch({ type: 'ADD_APPLICATION_FORM', payload: { ...published, id: `form-${jobId}-v${version}`, status: 'DRAFT', version, fields: [...baseFields, ...additions.map((item) => item.field)], requirementFingerprint: createJobRequirementFingerprint(job!), createdAt: timestamp, updatedAt: timestamp } })
  }
  function submitField(field: ApplicationFormField) {
    if (!draft) return
    const normalized = editing ? { ...field, id: editing.id } : { ...field, id: `field-${jobId}-${field.key.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}` }
    dispatch({ type: editing ? 'UPDATE_APPLICATION_FORM_FIELD' : 'ADD_APPLICATION_FORM_FIELD', payload: { formId: draft.id, field: normalized } })
    setDialogOpen(false); setEditing(undefined)
  }
  const suggestions = form ? generateRequirementAwareQuestions({ job, requirements, existingFields: form.fields }) : []
  function addSuggestions() {
    if (!draft) return
    for (const item of suggestions.filter((suggestion) => selected.includes(suggestion.id))) dispatch({ type: 'ADD_APPLICATION_FORM_FIELD', payload: { formId: draft.id, field: item.field } })
    setSelected([]); setSuggestionsOpen(false)
  }
  function continueToRules() {
    if (!form) return
    const timestamp = new Date().toISOString()
    const current = draft ? { ...draft, name: name.trim() || draft.name, description: description.trim() || undefined, requirementFingerprint: createJobRequirementFingerprint(job!), updatedAt: timestamp } : form
    if (draft) dispatch({ type: 'UPDATE_APPLICATION_FORM', payload: current })
    const rubricDraft = state.rubrics.find((item) => item.jobId === jobId && item.status === 'DRAFT')
    if (draft) {
      const previous = state.rubrics.filter((item) => item.jobId === jobId && item.status === 'PUBLISHED').sort((a, b) => b.version - a.version)[0]
      const generated = generateScreeningRules({ job: job!, requirements, form: current, previousRubric: previous })
      dispatch(rubricDraft ? { type: 'UPDATE_RUBRIC', payload: { rubric: { ...generated.rubric, id: rubricDraft.id, version: rubricDraft.version, createdAt: rubricDraft.createdAt } } } : { type: 'ADD_RUBRIC', payload: { rubric: generated.rubric } })
    }
    navigate(`/jobs/${jobId}/setup?step=screening`)
  }
  if (!form) return <Card className="p-8 text-center"><h2 className="m-0 text-lg font-semibold text-depth">Create the candidate application</h2><p className="mb-0 mt-2 text-sm text-aura-text-secondary">Start with core candidate details and focused evidence questions derived from this role.</p><Button className="mt-5" onClick={createInitial}>Create recommended form</Button></Card>
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="grid gap-4"><Card className="border-t-4 border-t-marine p-5"><label className="grid gap-1.5 text-sm font-semibold text-depth">Form title<input className="h-11 rounded-aura-sm border border-harbor/20 px-3 text-base" disabled={!draft} value={name} onChange={(event) => setName(event.target.value)} /></label><label className="mt-4 grid gap-1.5 text-sm font-semibold text-depth">Description<textarea className="min-h-20 rounded-aura-sm border border-harbor/20 px-3 py-2 text-sm" disabled={!draft} value={description} onChange={(event) => setDescription(event.target.value)} /></label></Card>{preview ? <FormPreview form={form} /> : <FormFieldList fields={form.fields} editable={Boolean(draft)} requirements={requirements} showFieldKey={false} onEdit={(field) => { setEditing(field); setDialogOpen(true) }} onRemove={(fieldId) => draft && dispatch({ type: 'REMOVE_APPLICATION_FORM_FIELD', payload: { formId: draft.id, fieldId } })} onMoveUp={(fieldId) => draft && dispatch({ type: 'MOVE_APPLICATION_FORM_FIELD', payload: { formId: draft.id, fieldId, direction: 'UP' } })} onMoveDown={(fieldId) => draft && dispatch({ type: 'MOVE_APPLICATION_FORM_FIELD', payload: { formId: draft.id, fieldId, direction: 'DOWN' } })} onReorder={(activeFieldId, overFieldId) => draft && dispatch({ type: 'REORDER_APPLICATION_FORM_FIELDS', payload: { formId: draft.id, activeFieldId, overFieldId } })} onDuplicate={(field) => draft && dispatch({ type: 'ADD_APPLICATION_FORM_FIELD', payload: { formId: draft.id, field: { ...field, id: `${field.id}-copy-${form.fields.length + 1}`, key: `${field.key}_copy_${form.fields.length + 1}`, label: `${field.label} (copy)` } } })} />}{draft ? <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-aura-md border border-harbor/15 bg-white/95 p-3 shadow-aura-md backdrop-blur"><div className="flex gap-2"><Button variant="secondary" onClick={() => { setEditing(undefined); setDialogOpen(true) }}><Plus size={16} />Add question</Button><Button variant="secondary" onClick={() => setSuggestionsOpen(true)}><Lightbulb size={16} />Suggest missing questions</Button><Button variant="ghost" onClick={() => setPreview((value) => !value)}><Eye size={16} />{preview ? 'Builder' : 'Preview'}</Button></div><Button onClick={continueToRules}>Save form and continue</Button></div> : <div className="flex justify-end"><Button onClick={createDraftVersion}>Create editable draft</Button></div>}</div><aside><RequirementCoveragePanel requirements={requirements} fields={form.fields} /></aside><AddFieldDialog open={dialogOpen} field={editing} requirements={requirements} onClose={() => setDialogOpen(false)} onSubmit={submitField} /><SuggestionDialog open={suggestionsOpen} suggestions={suggestions} selected={selected} onSelect={setSelected} onClose={() => setSuggestionsOpen(false)} onAdd={addSuggestions} /></div>
}

function SuggestionDialog({ open, suggestions, selected, onSelect, onClose, onAdd }: { open: boolean; suggestions: RequirementAwareQuestionSuggestion[]; selected: string[]; onSelect: (ids: string[]) => void; onClose: () => void; onAdd: () => void }) {
  return <Dialog open={open} title="Suggest missing questions" onClose={onClose}><p className="m-0 text-sm text-aura-text-secondary">AURA suggests questions only for job requirements that are not yet covered.</p><div className="mt-4 grid gap-2">{suggestions.length ? suggestions.map((item) => <label className="flex gap-3 rounded-aura-sm border border-harbor/15 p-3" key={item.id}><input className="mt-1 size-4 accent-marine" type="checkbox" checked={selected.includes(item.id)} onChange={() => onSelect(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id])} /><span><strong className="text-sm text-depth">{item.field.label}</strong><small className="mt-1 block text-xs leading-5 text-aura-text-muted">{item.reason}</small></span></label>) : <p className="rounded-aura-sm bg-frost p-4 text-sm text-aura-text-secondary">All current requirements are covered.</p>}</div><div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!selected.length} onClick={onAdd}>Add selected questions</Button></div></Dialog>
}

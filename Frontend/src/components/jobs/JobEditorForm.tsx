import { AlertTriangle } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type { EmploymentType, WorkArrangement } from '../../types/job'
import type { JobDraftInput } from '../../types/jobDraft'
import { employmentTypes, validateJobDraft, workArrangements } from '../../utils/jobValidation'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { SkillListEditor } from './SkillListEditor'

type JobEditorFormProps = {
  initialValue: JobDraftInput
  submitLabel: string
  onSubmit: (input: JobDraftInput) => void
  onCancel: () => void
  requirementsWarning?: boolean
}

const fieldClass = 'h-10 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'
const labelMap: Record<EmploymentType | WorkArrangement, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary',
  ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote',
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-depth">{label}{children}{hint && !error ? <span className="text-xs font-normal text-aura-text-muted">{hint}</span> : null}{error ? <span className="text-xs font-normal text-aura-danger">{error}</span> : null}</label>
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card className="p-5 md:p-6"><div className="border-b border-harbor/10 pb-4"><h2 className="m-0 text-lg font-semibold text-depth">{title}</h2><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{description}</p></div><div className="mt-5">{children}</div></Card>
}

export function JobEditorForm({ initialValue, submitLabel, onSubmit, onCancel, requirementsWarning }: JobEditorFormProps) {
  const [form, setForm] = useState(initialValue)
  const [errors, setErrors] = useState<Record<string, string>>({})
  function update<K extends keyof JobDraftInput>(key: K, value: JobDraftInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: '' }))
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const validation = validateJobDraft(form)
    setErrors(validation.errors)
    if (validation.valid) onSubmit(form)
  }

  return <form className="grid gap-4" onSubmit={submit} noValidate>
    {requirementsWarning ? <div className="flex gap-3 rounded-aura-sm border border-aura-warning/25 bg-aura-warning-soft p-4 text-sm text-aura-warning"><AlertTriangle className="mt-0.5 shrink-0" size={17} /><p className="m-0 leading-6"><strong>Role requirements changed.</strong> Review the application form and screening setup after saving. Existing setup will not be changed automatically.</p></div> : null}
    <Section title="Role overview" description="Give candidates and recruiters a clear description of the role."><div className="grid gap-4 md:grid-cols-2"><Field label="Job title" error={errors.title}><input className={fieldClass} value={form.title} onChange={(event) => update('title', event.target.value)} /></Field><Field label="Department" error={errors.department}><input className={fieldClass} value={form.department} onChange={(event) => update('department', event.target.value)} /></Field><div className="md:col-span-2"><Field label="Description" error={errors.description} hint="Minimum 30 characters"><textarea className="min-h-32 w-full resize-y rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm leading-6 text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35" value={form.description} onChange={(event) => update('description', event.target.value)} /></Field></div></div></Section>
    <Section title="Employment details" description="Define the contract and where the role is based."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label="Number of positions" error={errors.positionsCount}><input className={fieldClass} type="number" min="1" step="1" value={form.positionsCount} onChange={(event) => update('positionsCount', Number(event.target.value))} /></Field><Field label="Employment type" error={errors.employmentType}><select className={fieldClass} value={form.employmentType} onChange={(event) => update('employmentType', event.target.value as EmploymentType)}>{employmentTypes.map((value) => <option key={value} value={value}>{labelMap[value]}</option>)}</select></Field><Field label="Work arrangement" error={errors.workArrangement}><select className={fieldClass} value={form.workArrangement} onChange={(event) => update('workArrangement', event.target.value as WorkArrangement)}>{workArrangements.map((value) => <option key={value} value={value}>{labelMap[value]}</option>)}</select></Field><Field label="Location" error={errors.location} hint={form.workArrangement === 'REMOTE' ? 'Optional for remote roles' : 'Required'}><input className={fieldClass} value={form.location} onChange={(event) => update('location', event.target.value)} placeholder={form.workArrangement === 'REMOTE' ? 'Optional' : 'City or office'} /></Field></div></Section>
    <Section title="Experience requirements" description="Set a clear baseline without over-constraining qualified applicants."><div className="max-w-xs"><Field label="Minimum experience" error={errors.minimumExperienceYears} hint="Years"><input className={fieldClass} type="number" min="0" step="0.5" value={form.minimumExperienceYears} onChange={(event) => update('minimumExperienceYears', Number(event.target.value))} /></Field></div></Section>
    <Section title="Required skills" description="Candidates should provide evidence for each core capability."><SkillListEditor label="Required skills" skills={form.requiredSkills} otherSkills={form.preferredSkills} onChange={(skills) => update('requiredSkills', skills)} error={errors.requiredSkills} /></Section>
    <Section title="Preferred skills" description="Useful strengths that are not mandatory for the role."><SkillListEditor label="Preferred skills" skills={form.preferredSkills} otherSkills={form.requiredSkills} onChange={(skills) => update('preferredSkills', skills)} error={errors.preferredSkills} /></Section>
    <Section title="Application timeline" description="A deadline is optional for drafts but must be in the future when opening."><div className="max-w-sm"><Field label="Application deadline" error={errors.applicationDeadline} hint="Optional"><input className={fieldClass} type="date" value={form.applicationDeadline} onChange={(event) => update('applicationDeadline', event.target.value)} /></Field></div></Section>
    {Object.keys(errors).some((key) => errors[key]) ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft p-4 text-sm text-aura-danger" role="alert">Review the highlighted job fields before saving.</p> : null}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button type="submit">{submitLabel}</Button></div>
  </form>
}

import { AlertCircle, AlertTriangle, ChevronDown } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react'
import type { EmploymentType, WorkArrangement } from '../../types/job'
import type { JobDraftInput } from '../../types/jobDraft'
import { focusJobDraftControl, getOrderedJobDraftIssues, reconcileJobDraftFieldErrors, validateJobDraftSubmission, workArrangements, employmentTypes, type JobDraftField } from '../../utils/jobValidation'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Dialog } from '../ui/Dialog'
import { SkillListEditor } from './SkillListEditor'

type JobEditorFormProps = {
  initialValue: JobDraftInput
  submitLabel: string
  onSubmit: (input: JobDraftInput) => void
  onCancel: () => void
  requirementsWarning?: boolean
}

const fieldClass = 'h-10 w-full rounded-aura-sm border border-[#1E2022]/12 bg-white px-3 text-sm text-[#1E2022] shadow-aura-xs focus:border-[#C7FF38]/60 focus:outline-none focus:ring-2 focus:ring-[#C7FF38]/20 transition-all duration-200 focus:scale-[1.005] hover:border-[#1E2022]/25'
const selectClass = 'h-10 w-full appearance-none rounded-aura-sm border border-[#1E2022]/12 bg-white px-3 pr-10 text-sm text-[#1E2022] shadow-aura-xs focus:border-[#C7FF38]/60 focus:outline-none focus:ring-2 focus:ring-[#C7FF38]/20 transition-all duration-200 focus:scale-[1.005] hover:border-[#1E2022]/25'

const labelMap: Record<EmploymentType | WorkArrangement, string> = {
  FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary',
  ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote',
}

function Field({ label, error, errorId, hint, children }: { label: string; error?: string; errorId?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-[#1E2022]/70 uppercase tracking-wider">
      {label}
      {children}
      {hint && !error ? <span className="text-[11px] font-medium text-slate-400 lowercase">{hint}</span> : null}
      {error ? <span id={errorId} className="text-xs font-semibold text-red-600 uppercase tracking-normal">{error}</span> : null}
    </label>
  )
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card className="p-5 md:p-6"><div className="border-b border-[#1E2022]/10 pb-4"><h2 className="m-0 text-lg font-semibold text-[#1E2022]">{title}</h2><p className="mb-0 mt-1 text-sm text-slate-500">{description}</p></div><div className="mt-5">{children}</div></Card>
}

export function JobEditorForm({ initialValue, submitLabel, onSubmit, onCancel, requirementsWarning }: JobEditorFormProps) {
  const [form, setForm] = useState(initialValue)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const departmentRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const positionsCountRef = useRef<HTMLInputElement>(null)
  const employmentTypeRef = useRef<HTMLSelectElement>(null)
  const workArrangementRef = useRef<HTMLSelectElement>(null)
  const locationRef = useRef<HTMLInputElement>(null)
  const minimumExperienceRef = useRef<HTMLInputElement>(null)
  const requiredSkillsRef = useRef<HTMLInputElement>(null)
  const preferredSkillsRef = useRef<HTMLInputElement>(null)
  const applicationDeadlineRef = useRef<HTMLInputElement>(null)
  const fieldRefs: Record<JobDraftField, RefObject<HTMLElement | null>> = {
    title: titleRef, department: departmentRef, description: descriptionRef,
    positionsCount: positionsCountRef, employmentType: employmentTypeRef,
    workArrangement: workArrangementRef, location: locationRef,
    minimumExperienceYears: minimumExperienceRef, requiredSkills: requiredSkillsRef,
    preferredSkills: preferredSkillsRef, applicationDeadline: applicationDeadlineRef,
  }
  const errorId = (field: JobDraftField) => `job-draft-${field}-error`
  const invalidProps = (field: JobDraftField) => ({
    'aria-invalid': Boolean(errors[field]) || undefined,
    'aria-describedby': errors[field] ? errorId(field) : undefined,
  })
  function update<K extends keyof JobDraftInput>(key: K, value: JobDraftInput[K]) {
    const next = { ...form, [key]: value }
    setForm(next)
    if (Object.values(errors).some(Boolean)) {
      setErrors((current) => reconcileJobDraftFieldErrors(current, next))
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const result = validateJobDraftSubmission(form)
    if (result.valid) {
      setErrors({})
      setValidationDialogOpen(false)
      onSubmit(result.data)
      return
    }
    setErrors(result.errors)
    setValidationDialogOpen(result.shouldOpenDialog)
  }
  function focusField(field: JobDraftField) {
    setValidationDialogOpen(false)
    focusJobDraftControl(field, fieldRefs)
  }
  const orderedIssues = getOrderedJobDraftIssues(errors)

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {requirementsWarning ? (
        <div className="flex gap-3 rounded-aura-sm border border-aura-warning/25 bg-aura-warning-soft p-4 text-sm text-aura-warning animate-fade-in">
          <AlertTriangle className="mt-0.5 shrink-0" size={17} />
          <p className="m-0 leading-6">
            <strong>Role requirements changed.</strong> Review the application form and screening setup after saving. Existing setup will not be changed automatically.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Main Column */}
        <div className="lg:col-span-2 space-y-6 animate-fade-in">
          <Section title="Role overview" description="Give candidates and recruiters a clear description of the role.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Job title" error={errors.title} errorId={errorId('title')}>
                <input ref={titleRef} id="job-draft-title" className={fieldClass} value={form.title} onChange={(event) => update('title', event.target.value)} {...invalidProps('title')} />
              </Field>
              <Field label="Department" error={errors.department} errorId={errorId('department')}>
                <input ref={departmentRef} id="job-draft-department" className={fieldClass} value={form.department} onChange={(event) => update('department', event.target.value)} {...invalidProps('department')} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description" error={errors.description} errorId={errorId('description')} hint="Minimum 30 characters">
                  <textarea ref={descriptionRef} id="job-draft-description" className="min-h-32 w-full resize-y rounded-aura-sm border border-[#1E2022]/12 bg-white px-3 py-2.5 text-sm leading-6 text-[#1E2022] focus:border-[#C7FF38]/60 focus:outline-none focus:ring-2 focus:ring-[#C7FF38]/20 transition-all duration-200 focus:scale-[1.005] hover:border-[#1E2022]/25" value={form.description} onChange={(event) => update('description', event.target.value)} {...invalidProps('description')} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Required skills" description="Candidates should provide evidence for each core capability.">
            <SkillListEditor label="Required skills" skills={form.requiredSkills} otherSkills={form.preferredSkills} onChange={(skills) => update('requiredSkills', skills)} error={errors.requiredSkills} inputRef={requiredSkillsRef} inputId="job-draft-required-skills" errorId={errorId('requiredSkills')} />
          </Section>

          <Section title="Preferred skills" description="Useful strengths that are not mandatory for the role.">
            <SkillListEditor label="Preferred skills" skills={form.preferredSkills} otherSkills={form.requiredSkills} onChange={(skills) => update('preferredSkills', skills)} error={errors.preferredSkills} inputRef={preferredSkillsRef} inputId="job-draft-preferred-skills" errorId={errorId('preferredSkills')} />
          </Section>
        </div>

        {/* Right Sticky Sidebar Column */}
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit animate-fade-in">
          <Section title="Employment details" description="Define the contract and where the role is based.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Field label="Number of positions" error={errors.positionsCount} errorId={errorId('positionsCount')}>
                <input ref={positionsCountRef} id="job-draft-positions" className={fieldClass} type="number" min="1" step="1" value={form.positionsCount} onChange={(event) => update('positionsCount', Number(event.target.value))} {...invalidProps('positionsCount')} />
              </Field>
              <Field label="Employment type" error={errors.employmentType} errorId={errorId('employmentType')}>
                <div className="relative">
                  <select ref={employmentTypeRef} id="job-draft-employment-type" className={selectClass} value={form.employmentType} onChange={(event) => update('employmentType', event.target.value as EmploymentType)} {...invalidProps('employmentType')}>
                    {employmentTypes.map((value) => <option key={value} value={value}>{labelMap[value]}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </Field>
              <Field label="Work arrangement" error={errors.workArrangement} errorId={errorId('workArrangement')}>
                <div className="relative">
                  <select ref={workArrangementRef} id="job-draft-work-arrangement" className={selectClass} value={form.workArrangement} onChange={(event) => update('workArrangement', event.target.value as WorkArrangement)} {...invalidProps('workArrangement')}>
                    {workArrangements.map((value) => <option key={value} value={value}>{labelMap[value]}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </Field>
              <Field label="Location" error={errors.location} errorId={errorId('location')} hint={form.workArrangement === 'REMOTE' ? 'Optional for remote roles' : 'Required'}>
                <input ref={locationRef} id="job-draft-location" className={fieldClass} value={form.location} onChange={(event) => update('location', event.target.value)} placeholder={form.workArrangement === 'REMOTE' ? 'Optional' : 'City or office'} {...invalidProps('location')} />
              </Field>
            </div>
          </Section>

          <Section title="Experience requirements" description="Set a clear experience baseline.">
            <Field label="Minimum experience (years)" error={errors.minimumExperienceYears} errorId={errorId('minimumExperienceYears')}>
              <input ref={minimumExperienceRef} id="job-draft-minimum-experience" className={fieldClass} type="number" min="0" step="0.5" value={form.minimumExperienceYears} onChange={(event) => update('minimumExperienceYears', Number(event.target.value))} {...invalidProps('minimumExperienceYears')} />
            </Field>
          </Section>

          <Section title="Application timeline" description="Select the optional deadline date.">
            <Field label="Application deadline" error={errors.applicationDeadline} errorId={errorId('applicationDeadline')} hint="Optional">
              <input ref={applicationDeadlineRef} id="job-draft-application-deadline" className={fieldClass} type="date" value={form.applicationDeadline} onChange={(event) => update('applicationDeadline', event.target.value)} {...invalidProps('applicationDeadline')} />
            </Field>
          </Section>
        </div>
      </div>

      {/* Buttons and Validation Dialog */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-6">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button ref={submitButtonRef} type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>

      <Dialog open={validationDialogOpen} title="Job draft needs attention" description="Complete the highlighted fields before saving." onClose={() => setValidationDialogOpen(false)} returnFocusRef={submitButtonRef}>
        <div className="flex gap-3 rounded-aura-sm border border-aura-danger/20 bg-aura-danger-soft p-4"><AlertCircle className="mt-0.5 shrink-0 text-aura-danger" size={18} aria-hidden="true" /><div><p className="m-0 text-sm font-semibold text-depth">Review {orderedIssues.length} highlighted {orderedIssues.length === 1 ? 'field' : 'fields'}</p><p className="mb-0 mt-1 text-xs text-aura-text-secondary">Choose an issue to move directly to that field.</p></div></div>
        <ul className="mt-4 grid gap-2 p-0">{orderedIssues.map((issue) => <li key={issue.field}><button type="button" className="w-full rounded-aura-sm border border-harbor/15 bg-white px-4 py-3 text-left text-sm font-semibold text-depth transition-colors hover:border-marine hover:bg-glacier/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" onClick={() => focusField(issue.field)}>{issue.message}</button></li>)}</ul>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setValidationDialogOpen(false)}>Cancel</Button><Button onClick={() => orderedIssues[0] && focusField(orderedIssues[0].field)}>Review fields</Button></div>
      </Dialog>
    </form>
  )
}

import { useEffect, useState, type FormEvent } from 'react'
import type {
  ApplicationFormField,
  ApplicationFormFieldType,
} from '../../types/applicationForm'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { JobRequirement } from '../../types/jobRequirement'

type FormFieldEditorProps = {
  initialField?: ApplicationFormField
  onSubmit: (field: ApplicationFormField) => void
  onCancel: () => void
  requirements?: JobRequirement[]
}

const fieldTypes: ApplicationFormFieldType[] = [
  'TEXT',
  'EMAIL',
  'PHONE',
  'URL',
  'NUMBER',
  'TEXTAREA',
  'MULTI_SELECT',
  'FILE',
]

function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function FormFieldEditor({
  initialField,
  onSubmit,
  onCancel,
  requirements = [],
}: FormFieldEditorProps) {
  const [label, setLabel] = useState(initialField?.label ?? '')
  const [key, setKey] = useState(initialField?.key ?? '')
  const [type, setType] = useState<ApplicationFormFieldType>(
    initialField?.type ?? 'TEXT',
  )
  const [required, setRequired] = useState(initialField?.required ?? false)
  const [placeholder, setPlaceholder] = useState(
    initialField?.placeholder ?? '',
  )
  const [helpText, setHelpText] = useState(initialField?.helpText ?? '')
  const [optionLines, setOptionLines] = useState(
    initialField?.options?.map((option) => option.value).join('\n') ?? '',
  )
  const [error, setError] = useState('')
  const [requirementIds, setRequirementIds] = useState(initialField?.screeningMapping?.requirementIds ?? [])
  const [selectedCriterionKeys, setSelectedCriterionKeys] = useState(initialField?.screeningMapping?.criterionKeys ?? [])
  const [evidenceImportance, setEvidenceImportance] = useState(initialField?.screeningMapping?.evidenceImportance ?? 'SUPPORTING')

  useEffect(() => {
    if (key.trim() !== 'github_repository_url') return
    setType('URL')
    if (!label.trim() || label === initialField?.label) setLabel('GitHub Repository URL')
    if (!placeholder.trim() || placeholder === initialField?.placeholder) setPlaceholder('https://github.com/username/repository')
    if (!helpText.trim() || helpText === initialField?.helpText) {
      setHelpText('Enter a public GitHub repository URL containing work relevant to this role.')
    }
  }, [helpText, initialField?.helpText, initialField?.label, initialField?.placeholder, key, label, placeholder])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedKey = key.trim()

    if (!label.trim() || !normalizedKey) {
      setError('Field label and field key are required.')
      return
    }

    if (normalizedKey === 'github_repository_url' && type !== 'URL') {
      setError('GitHub Repository URL must use the URL field type.')
      return
    }

    const optionValues = optionLines
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)

    if (type === 'MULTI_SELECT' && optionValues.length === 0) {
      setError('Add at least one option for a multi-select field.')
      return
    }

    const criterionKeys = selectedCriterionKeys.length ? selectedCriterionKeys : requirementIds.length ? Array.from(new Set(requirementIds.flatMap((id) => requirements.find((item) => item.id === id)?.importance === 'REQUIRED' ? ['required_qualifications', 'role_evidence'] : ['role_evidence']))) : []
    onSubmit({
      id: initialField?.id ?? `field-${normalizeIdentifier(normalizedKey)}`,
      key: normalizedKey,
      label: label.trim(),
      type,
      required,
      ...(placeholder.trim() ? { placeholder: placeholder.trim() } : {}),
      ...(helpText.trim() ? { helpText: helpText.trim() } : {}),
      ...(type === 'MULTI_SELECT'
        ? {
            options: optionValues.map((value) => ({
              id: `option-${normalizeIdentifier(value)}`,
              label: value,
              value,
            })),
          }
        : {}),
      ...(requirementIds.length || criterionKeys.length ? { screeningMapping: { requirementIds, criterionKeys, evidenceImportance } } : {}),
    })
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      {error ? (
        <p
          className="m-0 rounded-aura-sm border border-aura-danger/30 bg-aura-danger-soft px-3 py-2 text-sm font-medium text-aura-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-depth">Field label</span>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-depth">Field key</span>
          <Input value={key} onChange={(event) => setKey(event.target.value)} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-depth">Field type</span>
          <select
            className="w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm text-depth shadow-aura-xs focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35"
            value={type}
            onChange={(event) =>
              setType(event.target.value as ApplicationFormFieldType)
            }
          >
            {fieldTypes.map((fieldType) => (
              <option key={fieldType} value={fieldType}>
                {fieldType.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-depth">Placeholder</span>
          <Input value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} />
        </label>
      </div>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-depth">Help text</span>
        <Input value={helpText} onChange={(event) => setHelpText(event.target.value)} />
      </label>
      <label className="flex items-center gap-2.5 text-sm font-medium text-harbor">
        <input
          className="size-4 accent-marine"
          type="checkbox"
          checked={required}
          onChange={(event) => setRequired(event.target.checked)}
        />
        <span>This field is required</span>
      </label>
      {type === 'MULTI_SELECT' ? (
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-depth">Options</span>
          <textarea
            className="w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm text-depth shadow-aura-xs placeholder:text-harbor/45 focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35"
            value={optionLines}
            onChange={(event) => setOptionLines(event.target.value)}
            rows={6}
            placeholder={'React\nTypeScript\nJavaScript'}
          />
          <small className="text-xs text-aura-text-muted">
            Enter one option per line.
          </small>
        </label>
      ) : null}
      {requirements.length ? <section className="rounded-aura-sm border border-harbor/15 bg-frost/55 p-4"><h3 className="m-0 text-sm font-semibold text-depth">Screening purpose</h3><p className="mb-0 mt-1 text-xs leading-5 text-aura-text-secondary">Mapped questions provide evidence for automatic screening. Unmapped questions remain visible to recruiters but do not affect scoring.</p><p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Related job requirements</p><div className="grid gap-2 sm:grid-cols-2">{requirements.map((requirement) => <label className="flex items-start gap-2 text-sm text-depth" key={requirement.id}><input className="mt-0.5 size-4 accent-marine" type="checkbox" checked={requirementIds.includes(requirement.id)} onChange={() => setRequirementIds((current) => current.includes(requirement.id) ? current.filter((id) => id !== requirement.id) : [...current, requirement.id])} /><span>{requirement.label}<small className="block text-xs text-aura-text-muted">{requirement.importance === 'REQUIRED' ? 'Required qualification' : requirement.importance === 'PREFERRED' ? 'Preferred qualification' : 'Supporting evidence'}</small></span></label>)}</div><p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-aura-text-muted">Evaluation categories</p><div className="flex flex-wrap gap-2">{[['required_qualifications','Requirements'],['relevant_experience','Working Experience'],['role_evidence','Teamwork'],['problem_solving','Problem-solving ability'],['communication','Communication skills']].map(([key, label]) => <label className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedCriterionKeys.includes(key!) ? 'border-marine bg-glacier/15 text-harbor' : 'border-harbor/15 bg-white text-aura-text-muted'}`} key={key}><input className="sr-only" type="checkbox" checked={selectedCriterionKeys.includes(key!)} onChange={() => setSelectedCriterionKeys((current) => current.includes(key!) ? current.filter((item) => item !== key) : [...current, key!])} />{label}</label>)}</div><label className="mt-4 grid gap-1.5 text-sm font-semibold text-depth">Evidence importance<select className="h-10 rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm" value={evidenceImportance} onChange={(event) => setEvidenceImportance(event.target.value as typeof evidenceImportance)}><option value="REQUIRED">Required qualification</option><option value="PREFERRED">Preferred qualification</option><option value="SUPPORTING">Supporting evidence</option></select></label></section> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-harbor/15 pt-5">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialField ? 'Save field' : 'Add field'}</Button>
      </div>
    </form>
  )
}

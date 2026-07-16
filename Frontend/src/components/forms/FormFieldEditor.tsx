import { useState, type FormEvent } from 'react'
import type {
  ApplicationFormField,
  ApplicationFormFieldType,
} from '../../types/applicationForm'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

type FormFieldEditorProps = {
  initialField?: ApplicationFormField
  onSubmit: (field: ApplicationFormField) => void
  onCancel: () => void
}

const fieldTypes: ApplicationFormFieldType[] = [
  'TEXT',
  'EMAIL',
  'PHONE',
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedKey = key.trim()

    if (!label.trim() || !normalizedKey) {
      setError('Field label and field key are required.')
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
      <div className="flex flex-wrap justify-end gap-2 border-t border-harbor/15 pt-5">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialField ? 'Save field' : 'Add field'}</Button>
      </div>
    </form>
  )
}

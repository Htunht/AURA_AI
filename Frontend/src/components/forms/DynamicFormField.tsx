import type { ApplicationSubmissionValue } from '../../types/application'
import type { ApplicationFormField } from '../../types/applicationForm'
import { getApplicationFormInputType } from '../../utils/applicationFormFieldRendering'
import { Input } from '../ui/Input'

type DynamicFormFieldProps = {
  field: ApplicationFormField
  value: ApplicationSubmissionValue | undefined
  onChange: (value: ApplicationSubmissionValue) => void
  onFileChange?: (file: File | undefined) => void
  error?: string
}

export function DynamicFormField({
  field,
  value,
  onChange,
  onFileChange,
  error,
}: DynamicFormFieldProps) {
  const controlId = `application-${field.id}`
  const stringValue = typeof value === 'string' ? value : ''

  const renderControl = () => {
    if (field.type === 'TEXTAREA') {
      return (
        <textarea
          className="w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm text-depth shadow-aura-xs placeholder:text-harbor/45 focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35 disabled:bg-frost disabled:text-harbor/50"
          id={controlId}
          value={stringValue}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          aria-invalid={Boolean(error)}
        />
      )
    }

    if (field.type === 'MULTI_SELECT') {
      const selectedValues = Array.isArray(value) ? value : []

      return (
        <div
          className="grid gap-2 md:grid-cols-2"
          aria-describedby={error ? `${controlId}-error` : undefined}
        >
          {(field.options ?? []).map((option) => (
            <label
              className="flex items-center gap-2.5 rounded-aura-sm border border-harbor/15 bg-frost/55 px-3 py-2.5 text-sm font-medium text-depth transition-colors duration-150 has-[:checked]:border-marine/40 has-[:checked]:bg-glacier/15"
              key={option.id}
            >
              <input
                className="size-4 accent-marine"
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter((item) => item !== option.value),
                  )
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )
    }

    if (field.type === 'FILE') {
      return (
        <div>
          <Input
            id={controlId}
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              onChange(file?.name ?? '')
              onFileChange?.(file)
            }}
            aria-invalid={Boolean(error)}
          />
          {stringValue ? (
            <p className="mt-2 mb-0 text-xs font-semibold text-harbor">
              Selected: {stringValue}
            </p>
          ) : null}
          <p className="mt-2 mb-0 text-xs leading-5 text-aura-text-muted">
            PDF or DOC format recommended.
          </p>
        </div>
      )
    }

    if (field.type === 'NUMBER') {
      return (
        <Input
          id={controlId}
          type="number"
          value={typeof value === 'number' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => {
            if (event.target.value === '') {
              onChange('')
              return
            }

            const nextValue = Number(event.target.value)
            if (Number.isFinite(nextValue)) {
              onChange(nextValue)
            }
          }}
          aria-invalid={Boolean(error)}
        />
      )
    }

    return (
      <Input
        id={controlId}
        type={getApplicationFormInputType(field)}
        value={stringValue}
        placeholder={field.placeholder}
        onChange={(event) => onChange(field.type === 'URL' ? event.target.value.trimStart() : event.target.value)}
        aria-invalid={Boolean(error)}
      />
    )
  }

  return (
    <div className="grid gap-2">
      <label
        className="flex items-center justify-between gap-3 text-sm font-semibold text-depth"
        htmlFor={field.type === 'MULTI_SELECT' ? undefined : controlId}
      >
        {field.label}
        {field.required ? (
          <span className="text-[11px] font-bold uppercase tracking-wide text-aura-danger">
            Required
          </span>
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-wide text-aura-text-muted">
            Optional
          </span>
        )}
      </label>
      {field.helpText ? (
        <p className="m-0 text-xs leading-5 text-aura-text-muted">
          {field.helpText}
        </p>
      ) : null}
      {renderControl()}
      {error ? (
        <p
          id={`${controlId}-error`}
          className="m-0 text-xs font-semibold text-aura-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

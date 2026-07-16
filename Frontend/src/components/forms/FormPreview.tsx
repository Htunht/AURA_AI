import type { ApplicationForm } from '../../types/applicationForm'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

type FormPreviewProps = {
  form: ApplicationForm
}

export function FormPreview({ form }: FormPreviewProps) {
  return (
    <Card className="mx-auto max-w-[790px] p-6 shadow-aura-sm md:p-8">
      <header className="flex items-start justify-between gap-5 border-b border-harbor/15 pb-5">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
            Candidate application
          </p>
          <h2 className="m-0 text-xl font-semibold text-depth">{form.name}</h2>
          <p className="mt-2 mb-0 text-sm text-aura-text-secondary">
            Version {form.version} · {form.fields.length} fields
          </p>
        </div>
        <Badge tone={form.status === 'PUBLISHED' ? 'accent' : 'warning'}>
          {form.status}
        </Badge>
      </header>
      <div className="mt-6 grid gap-5">
        {form.fields.map((field) => (
          <div className="grid gap-2" key={field.id}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-depth">
                {field.label}
              </span>
              <small className="text-xs text-aura-text-muted">
                {field.required ? 'Required' : 'Optional'}
              </small>
            </div>
            {field.helpText ? (
              <p className="m-0 text-xs text-aura-text-muted">
                {field.helpText}
              </p>
            ) : null}
            {field.type === 'MULTI_SELECT' ? (
              <div className="flex flex-wrap gap-2">
                {(field.options ?? []).map((option) => (
                  <span
                    className="rounded-aura-sm border border-harbor/15 bg-frost px-2.5 py-1.5 text-xs text-harbor"
                    key={option.id}
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            ) : field.type === 'TEXTAREA' ? (
              <div className="min-h-[88px] rounded-aura-sm border border-harbor/15 bg-frost/70 px-3 py-2.5 text-sm text-aura-text-muted">
                {field.placeholder ?? 'Long answer'}
              </div>
            ) : field.type === 'FILE' ? (
              <div className="rounded-aura-sm border border-dashed border-harbor/20 bg-frost/70 px-3 py-2.5 text-sm text-aura-text-muted">
                Choose a file
              </div>
            ) : (
              <div className="rounded-aura-sm border border-harbor/15 bg-frost/70 px-3 py-2.5 text-sm text-aura-text-muted">
                {field.placeholder ?? field.type.replace('_', ' ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

import { Lightbulb, LoaderCircle } from 'lucide-react'
import type { SuggestedApplicationQuestion } from '../../types/applicationQuestionSuggestion'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { ApplicationQuestionSuggestions } from './ApplicationQuestionSuggestions'

type ApplicationQuestionSuggestionsDialogProps = {
  open: boolean
  loading: boolean
  progressMessage?: string
  suggestions: SuggestedApplicationQuestion[]
  selectedIds: string[]
  error?: string
  onSelectionChange: (suggestionIds: string[]) => void
  onAddSelected: () => void
  onClose: () => void
}

export function ApplicationQuestionSuggestionsDialog({
  open,
  loading,
  progressMessage,
  suggestions,
  selectedIds,
  error,
  onSelectionChange,
  onAddSelected,
  onClose,
}: ApplicationQuestionSuggestionsDialogProps) {
  return (
    <Dialog
      open={open}
      title="Suggested application questions"
      onClose={onClose}
    >
      <div className="mb-5 grid grid-cols-[38px_minmax(0,1fr)] gap-3 rounded-aura-md border border-marine/20 bg-glacier/10 p-4">
        <span
          className="grid size-[38px] place-items-center rounded-aura-sm border border-marine/25 bg-white text-harbor"
          aria-hidden="true"
        >
          <Lightbulb size={17} />
        </span>
        <div>
          <Badge tone="accent">Suggested by AURA</Badge>
          <p className="mt-2 mb-0 text-sm leading-6 text-aura-text-secondary">
            AURA reviewed the job requirements, preferred skills, and evaluation
            rubric to identify useful application questions. Nothing is added
            until you select it.
          </p>
        </div>
      </div>

      {loading ? (
        <div
          className="flex min-h-32 items-center justify-center gap-3 rounded-aura-md border border-dashed border-harbor/20 bg-frost/70 text-harbor"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle
            className="animate-spin text-marine motion-reduce:animate-none"
            size={21}
            aria-hidden="true"
          />
          <div>
            <strong className="text-sm font-semibold text-depth">
              Preparing recommendations
            </strong>
            <p className="mt-1 mb-0 text-xs text-aura-text-muted">
              {progressMessage ?? 'Analyzing job requirements...'}
            </p>
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <p
          className="m-0 rounded-aura-sm border border-aura-danger/30 bg-aura-danger-soft px-4 py-3 text-sm text-aura-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {!loading && !error && suggestions.length > 0 ? (
        <ApplicationQuestionSuggestions
          suggestions={suggestions}
          selectedIds={selectedIds}
          onSelectionChange={onSelectionChange}
        />
      ) : null}

      {!loading && !error && suggestions.length === 0 ? (
        <div className="rounded-aura-md border border-harbor/15 bg-frost/70 p-8 text-center">
          <h3 className="m-0 text-lg font-semibold text-depth">
            Current form covers the evidence needs
          </h3>
          <p className="mt-2 mb-0 text-sm text-aura-text-secondary">
            No additional application questions are recommended for the current
            form.
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-harbor/15 pt-5">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onAddSelected}
          disabled={loading || selectedIds.length === 0}
        >
          Add selected questions
        </Button>
      </div>
    </Dialog>
  )
}

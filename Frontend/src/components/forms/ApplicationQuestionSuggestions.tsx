import type { SuggestedApplicationQuestion } from '../../types/applicationQuestionSuggestion'
import { Badge } from '../ui/Badge'

type ApplicationQuestionSuggestionsProps = {
  suggestions: SuggestedApplicationQuestion[]
  selectedIds: string[]
  onSelectionChange: (suggestionIds: string[]) => void
}

function formatCriterionKey(key: string): string {
  return key
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export function ApplicationQuestionSuggestions({
  suggestions,
  selectedIds,
  onSelectionChange,
}: ApplicationQuestionSuggestionsProps) {
  const selectedIdSet = new Set(selectedIds)

  const updateSelection = (suggestionId: string, selected: boolean) => {
    onSelectionChange(
      selected
        ? [...selectedIds, suggestionId]
        : selectedIds.filter((id) => id !== suggestionId),
    )
  }

  return (
    <div className="grid max-h-[min(470px,52vh)] gap-3 overflow-y-auto pr-1">
      {suggestions.map((suggestion) => {
        const checked = selectedIdSet.has(suggestion.id)

        return (
          <label
            key={suggestion.id}
            className={`grid cursor-pointer grid-cols-[18px_minmax(0,1fr)] gap-3 rounded-aura-md border p-4 transition-colors duration-150 ${
              checked
                ? 'border-marine bg-glacier/15 shadow-aura-sm'
                : 'border-marine/20 bg-glacier/10 hover:border-marine/45'
            }`}
          >
            <input
              className="mt-1 size-4 accent-marine"
              type="checkbox"
              checked={checked}
              onChange={(event) =>
                updateSelection(suggestion.id, event.target.checked)
              }
            />
            <span className="grid gap-3">
              <span className="text-sm font-semibold leading-6 text-depth">
                {suggestion.field.label}
              </span>
              <span className="grid gap-1 text-xs leading-5 text-aura-text-secondary">
                <strong className="text-[11px] font-bold uppercase tracking-wide text-harbor">
                  Reason
                </strong>
                <span>{suggestion.reason}</span>
              </span>
              <span className="flex flex-wrap items-center justify-between gap-2 border-t border-marine/15 pt-3">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-[11px] font-bold uppercase tracking-wide text-harbor">
                    Target criteria
                  </strong>
                  {suggestion.targetCriterionKeys.map((key) => (
                    <Badge key={key}>{formatCriterionKey(key)}</Badge>
                  ))}
                </span>
                <Badge tone="accent">
                  {suggestion.field.type.replace('_', ' ')}
                </Badge>
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

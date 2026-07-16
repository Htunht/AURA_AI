import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ApplicationFormField } from '../../types/applicationForm'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

type SortableFormFieldRowProps = {
  field: ApplicationFormField
  editable: boolean
  index: number
  isFirst: boolean
  isLast: boolean
  aiSuggested?: boolean
  onEdit: (field: ApplicationFormField) => void
  onRemove: (fieldId: string) => void
  onMoveUp: (fieldId: string) => void
  onMoveDown: (fieldId: string) => void
}

export function SortableFormFieldRow({
  field,
  editable,
  index,
  isFirst,
  isLast,
  aiSuggested = false,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SortableFormFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, disabled: !editable })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'relative z-10' : 'relative z-0'}
    >
      <Card
        className={`grid min-h-[82px] grid-cols-[44px_minmax(0,1fr)] overflow-hidden transition-colors duration-150 md:grid-cols-[52px_minmax(0,1fr)_auto] ${
          isDragging ? 'border-glacier bg-glacier/10 shadow-aura-md' : ''
        } ${!editable ? 'bg-white/80' : ''}`}
      >
        <span
          className="grid place-items-center border-r border-harbor/10 bg-frost font-utility text-xs font-bold text-harbor/70"
          aria-hidden="true"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 px-4 py-3.5 md:px-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="m-0 text-[15px] font-semibold text-depth">
              {field.label}
            </h3>
            <Badge tone={field.required ? 'warning' : 'neutral'}>
              {field.required ? 'Required' : 'Optional'}
            </Badge>
            {aiSuggested ? <Badge tone="accent">Suggested by AURA</Badge> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs font-medium text-aura-text-muted">
            <code className="rounded-aura-xs bg-frost px-1.5 py-1 font-utility text-[11px] text-harbor">
              {field.key}
            </code>
            <span>{field.type.replace('_', ' ')}</span>
            {field.type === 'MULTI_SELECT' ? (
              <span>{field.options?.length ?? 0} options</span>
            ) : null}
          </div>
        </div>
        {editable ? (
          <div className="col-span-2 flex flex-wrap justify-end gap-1 px-3 pb-3 md:col-span-1 md:items-center md:px-4 md:py-0">
            <button
              type="button"
              className="inline-grid size-9 touch-none place-items-center rounded-aura-sm border border-harbor/15 bg-white text-marine transition-colors duration-150 hover:bg-glacier/15 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Drag ${field.label} to reorder`}
              title="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-grid size-9 place-items-center rounded-aura-sm border border-harbor/15 bg-white text-harbor transition-colors duration-150 hover:bg-glacier/15 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onMoveUp(field.id)}
              disabled={isFirst}
              aria-label={`Move ${field.label} up`}
              title="Move up"
            >
              <ArrowUp size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-grid size-9 place-items-center rounded-aura-sm border border-harbor/15 bg-white text-harbor transition-colors duration-150 hover:bg-glacier/15 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onMoveDown(field.id)}
              disabled={isLast}
              aria-label={`Move ${field.label} down`}
              title="Move down"
            >
              <ArrowDown size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-grid size-9 place-items-center rounded-aura-sm border border-harbor/15 bg-white text-harbor transition-colors duration-150 hover:bg-glacier/15 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onEdit(field)}
              aria-label={`Edit ${field.label}`}
              title="Edit field"
            >
              <Pencil size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="inline-grid size-9 place-items-center rounded-aura-sm border border-aura-danger/30 bg-white text-aura-danger transition-colors duration-150 hover:bg-aura-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onRemove(field.id)}
              aria-label={`Remove ${field.label}`}
              title="Remove field"
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}

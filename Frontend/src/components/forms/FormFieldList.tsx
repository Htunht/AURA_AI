import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { ApplicationFormField } from '../../types/applicationForm'
import { Card } from '../ui/Card'
import { SortableFormFieldRow } from './SortableFormFieldRow'
import type { JobRequirement } from '../../types/jobRequirement'

type FormFieldListProps = {
  fields: ApplicationFormField[]
  editable: boolean
  aiSuggestedFieldIds?: ReadonlySet<string>
  onEdit: (field: ApplicationFormField) => void
  onRemove: (fieldId: string) => void
  onMoveUp: (fieldId: string) => void
  onMoveDown: (fieldId: string) => void
  onReorder: (activeFieldId: string, overFieldId: string) => void
  onDuplicate?: (field: ApplicationFormField) => void
  requirements?: JobRequirement[]
  showFieldKey?: boolean
}

export function FormFieldList({
  fields,
  editable,
  aiSuggestedFieldIds,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  onReorder,
  onDuplicate,
  requirements = [],
  showFieldKey = true,
}: FormFieldListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (fields.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="m-0 text-lg font-semibold text-depth">
          No fields have been added yet.
        </h3>
        <p className="mt-2 mb-0 text-sm text-aura-text-secondary">
          Add a field or ask AURA for suggestions.
        </p>
      </Card>
    )
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onReorder(String(active.id), String(over.id))
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={fields.map((field) => field.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid gap-2">
          {fields.map((field, index) => (
            <SortableFormFieldRow
              key={field.id}
              field={field}
              editable={editable}
              index={index}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
              aiSuggested={aiSuggestedFieldIds?.has(field.id) ?? false}
              onEdit={onEdit}
              onRemove={onRemove}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDuplicate={onDuplicate}
              requirements={requirements}
              showFieldKey={showFieldKey}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

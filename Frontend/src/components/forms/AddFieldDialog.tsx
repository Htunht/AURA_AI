import type { ApplicationFormField } from '../../types/applicationForm'
import { Dialog } from '../ui/Dialog'
import { FormFieldEditor } from './FormFieldEditor'

type AddFieldDialogProps = {
  open: boolean
  field?: ApplicationFormField
  onClose: () => void
  onSubmit: (field: ApplicationFormField) => void
}

export function AddFieldDialog({
  open,
  field,
  onClose,
  onSubmit,
}: AddFieldDialogProps) {
  return (
    <Dialog
      open={open}
      title={field ? 'Edit application field' : 'Add application field'}
      onClose={onClose}
    >
      <FormFieldEditor
        key={field?.id ?? 'new-field'}
        initialField={field}
        onCancel={onClose}
        onSubmit={onSubmit}
      />
    </Dialog>
  )
}

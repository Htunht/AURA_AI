import type { ApplicationFormField } from '../../types/applicationForm'
import { Dialog } from '../ui/Dialog'
import { FormFieldEditor } from './FormFieldEditor'
import type { JobRequirement } from '../../types/jobRequirement'

type AddFieldDialogProps = {
  open: boolean
  field?: ApplicationFormField
  onClose: () => void
  onSubmit: (field: ApplicationFormField) => void
  requirements?: JobRequirement[]
}

export function AddFieldDialog({
  open,
  field,
  onClose,
  onSubmit,
  requirements,
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
        requirements={requirements}
      />
    </Dialog>
  )
}

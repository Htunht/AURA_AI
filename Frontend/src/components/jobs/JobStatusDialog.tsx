import type { JobStatus } from '../../types/job'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

type LifecycleAction = 'OPEN' | 'CLOSE' | 'REOPEN' | 'ARCHIVE' | 'RESTORE'
const copy: Record<LifecycleAction, { title: string; message: string; button: string; target: JobStatus }> = {
  OPEN: { title: 'Open job for applications?', message: 'Candidates will be able to submit applications through the published application form.', button: 'Open job', target: 'OPEN' },
  CLOSE: { title: 'Close this job opening?', message: 'New applications will be disabled. Existing candidates and interviews will remain available.', button: 'Close job', target: 'CLOSED' },
  REOPEN: { title: 'Reopen job for applications?', message: 'Candidates will be able to submit applications again through the published form.', button: 'Reopen job', target: 'OPEN' },
  ARCHIVE: { title: 'Archive this job?', message: 'The job will be removed from active recruitment views. Historical hiring records will remain available.', button: 'Archive job', target: 'ARCHIVED' },
  RESTORE: { title: 'Restore this job to draft?', message: 'The job will return to draft so its details and setup can be reviewed before reopening.', button: 'Restore to draft', target: 'DRAFT' },
}

export function JobStatusDialog({ action, open, onClose, onConfirm }: { action: LifecycleAction; open: boolean; onClose: () => void; onConfirm: (status: JobStatus) => void }) {
  const content = copy[action]
  return <Dialog open={open} title={content.title} onClose={onClose}><p className="m-0 text-sm leading-6 text-aura-text-secondary">{content.message}</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={action === 'CLOSE' || action === 'ARCHIVE' ? 'danger' : 'primary'} onClick={() => onConfirm(content.target)}>{content.button}</Button></div></Dialog>
}

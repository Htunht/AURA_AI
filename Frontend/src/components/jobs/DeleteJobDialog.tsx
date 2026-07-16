import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export function DeleteJobDialog({ open, jobTitle, onClose, onConfirm }: { open: boolean; jobTitle: string; onClose: () => void; onConfirm: () => void }) {
  return <Dialog open={open} title="Delete unused job?" onClose={onClose}><p className="m-0 text-sm leading-6 text-aura-text-secondary"><strong>{jobTitle}</strong> will be permanently removed from this workspace. This is only available because the job has no recruitment history or configuration.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm}>Delete job</Button></div></Dialog>
}

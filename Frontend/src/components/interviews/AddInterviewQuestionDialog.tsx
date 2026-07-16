import { Dialog } from '../ui/Dialog'
import { InterviewQuestionEditor, type InterviewQuestionDraft } from './InterviewQuestionEditor'

export function AddInterviewQuestionDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (draft: InterviewQuestionDraft) => void }) {
  return <Dialog open={open} title="Add interview question" onClose={onClose}><p className="mt-0 text-sm leading-6 text-aura-text-secondary">Interviewer-added questions remain part of the approved plan but are not automatically linked to screening evidence.</p><InterviewQuestionEditor submitLabel="Add question" onSubmit={onAdd} onCancel={onClose} /></Dialog>
}

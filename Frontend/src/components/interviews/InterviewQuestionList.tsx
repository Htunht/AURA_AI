import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { InterviewQuestion } from '../../types/interviewQuestion'
import { InterviewQuestionCard } from './InterviewQuestionCard'

export function InterviewQuestionList({ questions, editable, onEdit, onDuplicate, onDelete, onMove, onDrag }: { questions: InterviewQuestion[]; editable: boolean; onEdit: (question: InterviewQuestion) => void; onDuplicate: (question: InterviewQuestion) => void; onDelete: (question: InterviewQuestion) => void; onMove: (questionId: string, direction: 'UP' | 'DOWN') => void; onDrag: (questionId: string, overId: string) => void }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  function handleDragEnd(event: DragEndEvent) { if (event.over && event.active.id !== event.over.id) onDrag(String(event.active.id), String(event.over.id)) }
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={questions.map((question) => question.id)} strategy={verticalListSortingStrategy}><div className="grid gap-3" role="list" aria-label="Interview questions">{questions.map((question, index) => <InterviewQuestionCard key={question.id} question={question} editable={editable} first={index === 0} last={index === questions.length - 1} onEdit={() => onEdit(question)} onDuplicate={() => onDuplicate(question)} onDelete={() => onDelete(question)} onMove={onMove} />)}</div></SortableContext></DndContext>
}

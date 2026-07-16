import {
  ExternalLink,
  Eye,
  FilePlus2,
  Lightbulb,
  Plus,
  Send,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AddFieldDialog } from '../components/forms/AddFieldDialog'
import { ApplicationQuestionSuggestionsDialog } from '../components/forms/ApplicationQuestionSuggestionsDialog'
import { FormFieldList } from '../components/forms/FormFieldList'
import { FormPreview } from '../components/forms/FormPreview'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { useDemoStore } from '../hooks/useDemoStore'
import {
  applicationQuestionSuggestionProgressMessages,
  suggestApplicationQuestions,
} from '../services/ai'
import { DemoServiceError } from '../services/DemoServiceError'
import {
  selectApplicationFormsByJobId,
  selectDraftApplicationFormByJobId,
  selectJobById,
  selectPublishedApplicationFormByJobId,
} from '../store/demoSelectors'
import type { ApplicationFormField } from '../types/applicationForm'
import type { SuggestedApplicationQuestion } from '../types/applicationQuestionSuggestion'
import { validateRecruitmentApplicationForm } from '../utils/applicationFormValidation'

const DEMO_TIMESTAMP = '2026-07-16T10:30:00Z'

const secondaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-transparent px-4 text-sm font-semibold text-[#446e87] no-underline transition-all shadow-[0_0_8px_rgba(114,163,191,0.25)] hover:bg-[#72a3bf]/15 hover:shadow-[0_0_14px_rgba(114,163,191,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

function formStatusTone(status?: string) {
  return status === 'PUBLISHED'
    ? 'accent'
    : status === 'DRAFT'
      ? 'warning'
      : 'neutral'
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function createFormId(jobId: string, version: number) {
  return `form-${jobId}-v${version}`
}

export default function ApplicationFormBuilder() {
  const { jobId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const [activeTab, setActiveTab] = useState('builder')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<ApplicationFormField>()
  const [messages, setMessages] = useState<string[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<
    SuggestedApplicationQuestion[]
  >([])
  const [selectedSuggestionIds, setSelectedSuggestionIds] = useState<string[]>(
    [],
  )
  const [suggestionsError, setSuggestionsError] = useState<string>()
  const [suggestionProgressIndex, setSuggestionProgressIndex] = useState(0)
  const [aiSuggestedFieldIds, setAiSuggestedFieldIds] = useState<Set<string>>(
    () => new Set(),
  )
  const job = selectJobById(state, jobId)

  useEffect(() => {
    if (!suggestionsOpen || !suggestionsLoading) {
      return
    }

    const intervalId = window.setInterval(() => {
      setSuggestionProgressIndex(
        (currentIndex) =>
          (currentIndex + 1) %
          applicationQuestionSuggestionProgressMessages.length,
      )
    }, 600)

    return () => window.clearInterval(intervalId)
  }, [suggestionsLoading, suggestionsOpen])

  if (!job) {
    return (
      <PageContainer title="Application form not found">
        <Card className="p-8 text-center">
          <p className="m-0 text-sm text-aura-text-secondary">
            The requested job opening does not exist.
          </p>
        </Card>
      </PageContainer>
    )
  }

  const forms = selectApplicationFormsByJobId(state, job.id)
  const draftForm = selectDraftApplicationFormByJobId(state, job.id)
  const publishedForm = selectPublishedApplicationFormByJobId(state, job.id)
  const activeForm = draftForm ?? publishedForm ?? forms[0]
  const editable = activeForm?.status === 'DRAFT'

  const requestSuggestions = async () => {
    if (!draftForm) {
      return
    }

    setSuggestionsOpen(true)
    setSuggestionsLoading(true)
    setSuggestions([])
    setSelectedSuggestionIds([])
    setSuggestionsError(undefined)
    setSuggestionProgressIndex(0)

    const rubric = state.rubrics.find((item) => item.jobId === job.id)

    if (!rubric) {
      setSuggestionsError(
        'AI suggestions require an evaluation rubric for this job.',
      )
      setSuggestionsLoading(false)
      return
    }

    try {
      const result = await suggestApplicationQuestions({
        job,
        rubric,
        existingFields: draftForm.fields,
      })
      setSuggestions(result.suggestions)
    } catch (error) {
      setSuggestionsError(
        error instanceof DemoServiceError
          ? error.message
          : 'Application question suggestions could not be prepared.',
      )
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const addSelectedSuggestions = () => {
    const currentDraft = selectDraftApplicationFormByJobId(state, job.id)

    if (!currentDraft) {
      setSuggestionsError(
        'Create a draft version before adding suggested questions.',
      )
      return
    }

    const currentKeys = new Set(
      currentDraft.fields.map((field) => field.key.trim().toLowerCase()),
    )
    const selectedIds = new Set(selectedSuggestionIds)
    const selectedSuggestions = suggestions.filter(
      (suggestion) =>
        selectedIds.has(suggestion.id) &&
        !currentKeys.has(suggestion.field.key.trim().toLowerCase()),
    )

    for (const suggestion of selectedSuggestions) {
      dispatch({
        type: 'ADD_APPLICATION_FORM_FIELD',
        payload: { formId: currentDraft.id, field: suggestion.field },
      })
      currentKeys.add(suggestion.field.key.trim().toLowerCase())
    }

    setAiSuggestedFieldIds(
      (currentIds) =>
        new Set([
          ...currentIds,
          ...selectedSuggestions.map((suggestion) => suggestion.field.id),
        ]),
    )
    setSelectedSuggestionIds([])
    setSuggestionsOpen(false)
    setMessages([
      `${selectedSuggestions.length} AURA-suggested ${
        selectedSuggestions.length === 1 ? 'question' : 'questions'
      } added to the draft.`,
    ])
  }

  const createDraftVersion = () => {
    if (!publishedForm) return
    const nextVersion = Math.max(...forms.map((form) => form.version)) + 1

    dispatch({
      type: 'ADD_APPLICATION_FORM',
      payload: {
        ...publishedForm,
        id: createFormId(job.id, nextVersion),
        name: `${job.title} Application`,
        status: 'DRAFT',
        version: nextVersion,
        fields: publishedForm.fields.map((field) => ({
          ...field,
          options: field.options?.map((option) => ({ ...option })),
        })),
        createdAt: DEMO_TIMESTAMP,
        updatedAt: DEMO_TIMESTAMP,
      },
    })
    setMessages(['Draft version created.'])
  }

  const openAddDialog = () => {
    setEditingField(undefined)
    setDialogOpen(true)
    setMessages([])
  }

  const submitField = (field: ApplicationFormField) => {
    if (!activeForm || !editable) return
    const normalizedField = editingField
      ? { ...field, id: editingField.id }
      : { ...field, id: `field-${job.id}-${normalizeKey(field.key)}` }
    const duplicateKey = activeForm.fields.some(
      (item) => item.id !== normalizedField.id && item.key === normalizedField.key,
    )

    if (duplicateKey) {
      setMessages([`The field key “${normalizedField.key}” is already in this form.`])
      return
    }

    dispatch({
      type: editingField ? 'UPDATE_APPLICATION_FORM_FIELD' : 'ADD_APPLICATION_FORM_FIELD',
      payload: { formId: activeForm.id, field: normalizedField },
    })
    setMessages([editingField ? 'Field updated.' : 'Field added.'])
    setDialogOpen(false)
    setEditingField(undefined)
  }

  const publishForm = () => {
    if (!activeForm) return
    const validation = validateRecruitmentApplicationForm(activeForm)
    if (!validation.valid) {
      setMessages(['Cannot publish application form', ...validation.errors])
      return
    }

    dispatch({
      type: 'PUBLISH_APPLICATION_FORM',
      payload: { formId: activeForm.id, updatedAt: DEMO_TIMESTAMP },
    })
    setMessages(['Application form published.'])
  }

  return (
    <PageContainer
      eyebrow="Application setup"
      title={`${job.title} application form`}
      description={
        activeForm
          ? `Version ${activeForm.version} · ${activeForm.status} · ${activeForm.fields.length} fields`
          : `Configure the application form for ${job.title}.`
      }
      actions={
        <Link className={secondaryLinkClass} to={`/apply/${job.id}`}>
          <ExternalLink size={16} />
          Open public form
        </Link>
      }
    >
      <div
        className="mb-4 flex gap-2 overflow-x-auto"
        aria-label="Application form versions"
      >
        {forms.map((form) => (
          <span
            className={`flex-none rounded-aura-sm border px-3 py-1.5 font-utility text-[11px] font-semibold ${
              form.id === activeForm?.id
                ? 'border-marine/40 bg-glacier/15 text-harbor'
                : 'border-harbor/15 bg-white/70 text-aura-text-muted'
            }`}
            key={form.id}
          >
            v{form.version} · {form.status}
          </span>
        ))}
      </div>

      {!activeForm ? (
        <Card className="p-8 text-center">
          <h2 className="m-0 text-lg font-semibold text-depth">
            No application form
          </h2>
          <p className="mt-2 mb-0 text-sm text-aura-text-secondary">
            This job has no configured application form.
          </p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="m-0 text-lg font-semibold text-depth">
                  {activeForm.name}
                </h2>
                <Badge tone={formStatusTone(activeForm.status)}>
                  {activeForm.status}
                </Badge>
              </div>
              <p className="mt-2 mb-0 text-sm text-aura-text-secondary">
                Version {activeForm.version} · {activeForm.fields.length} fields
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {editable ? (
                <Button variant="secondary" onClick={requestSuggestions}>
                  <Lightbulb size={16} />
                  Suggest questions
                </Button>
              ) : null}
              {editable ? (
                <Button variant="secondary" onClick={openAddDialog}>
                  <Plus size={16} />
                  Add field
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setActiveTab('preview')}>
                <Eye size={16} />
                Preview
              </Button>
              {editable ? (
                <Button onClick={publishForm}>
                  <Send size={16} />
                  Publish form
                </Button>
              ) : null}
              {!draftForm && publishedForm ? (
                <Button variant="secondary" onClick={createDraftVersion}>
                  <FilePlus2 size={16} />
                  Create draft version
                </Button>
              ) : null}
            </div>
          </Card>

          {!editable ? (
            <p className="mt-3 rounded-aura-sm border border-marine/20 bg-glacier/10 px-4 py-3 text-sm leading-6 text-harbor">
              Published forms are read-only. Create a new draft version to make
              changes.
            </p>
          ) : null}
          {messages.length > 0 ? (
            <div
              className={
                messages[0].startsWith('Cannot') ||
                messages[0].includes('already')
                  ? 'mt-3 rounded-aura-sm border border-aura-danger/30 bg-aura-danger-soft px-4 py-3 text-sm text-aura-danger'
                  : 'mt-3 rounded-aura-sm border border-marine/20 bg-glacier/10 px-4 py-3 text-sm text-harbor'
              }
              role="status"
            >
              {messages.map((message) => (
                <p className="m-0" key={message}>
                  {message}
                </p>
              ))}
            </div>
          ) : null}

          <Tabs items={[{ id: 'builder', label: 'Builder' }, { id: 'preview', label: 'Preview' }]} activeId={activeTab} onChange={setActiveTab} />
          {activeTab === 'builder' ? (
            <FormFieldList
              fields={activeForm.fields}
              editable={editable}
              aiSuggestedFieldIds={aiSuggestedFieldIds}
              onEdit={(field) => { setEditingField(field); setDialogOpen(true); setMessages([]) }}
              onRemove={(fieldId) => dispatch({ type: 'REMOVE_APPLICATION_FORM_FIELD', payload: { formId: activeForm.id, fieldId } })}
              onMoveUp={(fieldId) => dispatch({ type: 'MOVE_APPLICATION_FORM_FIELD', payload: { formId: activeForm.id, fieldId, direction: 'UP' } })}
              onMoveDown={(fieldId) => dispatch({ type: 'MOVE_APPLICATION_FORM_FIELD', payload: { formId: activeForm.id, fieldId, direction: 'DOWN' } })}
              onReorder={(activeFieldId, overFieldId) => dispatch({ type: 'REORDER_APPLICATION_FORM_FIELDS', payload: { formId: activeForm.id, activeFieldId, overFieldId } })}
            />
          ) : <FormPreview form={activeForm} />}

          <Card className="mt-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
                Public apply link
              </p>
              <code className="rounded-aura-xs bg-frost px-2 py-1 font-utility text-xs text-harbor">
                /apply/{job.id}
              </code>
            </div>
            <Link className={secondaryLinkClass} to={`/apply/${job.id}`}>
              <ExternalLink size={16} />
              Open public form
            </Link>
          </Card>
        </>
      )}

      <AddFieldDialog open={dialogOpen} field={editingField} onClose={() => setDialogOpen(false)} onSubmit={submitField} />
      <ApplicationQuestionSuggestionsDialog
        open={suggestionsOpen}
        loading={suggestionsLoading}
        progressMessage={applicationQuestionSuggestionProgressMessages[suggestionProgressIndex]}
        suggestions={suggestions}
        selectedIds={selectedSuggestionIds}
        error={suggestionsError}
        onSelectionChange={setSelectedSuggestionIds}
        onAddSelected={addSelectedSuggestions}
        onClose={() => setSuggestionsOpen(false)}
      />
    </PageContainer>
  )
}

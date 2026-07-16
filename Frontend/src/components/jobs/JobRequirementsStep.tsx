import { useNavigate } from 'react-router-dom'
import { createRecommendedApplicationForm, generateRequirementAwareQuestions } from '../../services/applicationQuestionGeneration'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { JobDraftInput } from '../../types/jobDraft'
import { createJobRequirementFingerprint, deriveJobRequirements } from '../../utils/jobRequirements'
import { draftSkillsToRequirements, jobToDraftInput } from '../../utils/jobValidation'
import { JobEditorForm } from './JobEditorForm'

export function JobRequirementsStep({ jobId }: { jobId: string }) {
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const job = state.jobs.find((item) => item.id === jobId)
  if (!job) return null
  function save(input: JobDraftInput) {
    const timestamp = new Date().toISOString()
    const updatedJob = { ...job!, title: input.title.trim(), department: input.department.trim(), description: input.description.trim(), positionsCount: input.positionsCount, employmentType: input.employmentType, workArrangement: input.workArrangement, location: input.location.trim() || undefined, minimumExperienceYears: input.minimumExperienceYears, requiredSkills: draftSkillsToRequirements(input, job!.requiredSkills), applicationDeadline: input.applicationDeadline || undefined, updatedAt: timestamp }
    dispatch({ type: 'UPDATE_JOB', payload: { jobId, changes: { title: updatedJob.title, department: updatedJob.department, description: updatedJob.description, positionsCount: updatedJob.positionsCount, employmentType: updatedJob.employmentType, workArrangement: updatedJob.workArrangement, location: updatedJob.location, minimumExperienceYears: updatedJob.minimumExperienceYears, requiredSkills: updatedJob.requiredSkills, applicationDeadline: updatedJob.applicationDeadline }, updatedAt: timestamp } })
    const requirements = deriveJobRequirements(updatedJob)
    const forms = state.applicationForms.filter((form) => form.jobId === jobId)
    const draft = forms.find((form) => form.status === 'DRAFT')
    const published = forms.find((form) => form.status === 'PUBLISHED')
    if (!draft && !published) dispatch({ type: 'ADD_APPLICATION_FORM', payload: createRecommendedApplicationForm(updatedJob, requirements, 1, timestamp) })
    else {
      const target = draft ?? (published ? { ...published, id: `form-${jobId}-v${Math.max(...forms.map((form) => form.version)) + 1}`, version: Math.max(...forms.map((form) => form.version)) + 1, status: 'DRAFT' as const, createdAt: timestamp, updatedAt: timestamp, fields: published.fields.map((field) => ({ ...field, screeningMapping: field.screeningMapping ? { ...field.screeningMapping, requirementIds: [...field.screeningMapping.requirementIds], criterionKeys: [...field.screeningMapping.criterionKeys] } : undefined })) } : undefined)
      if (target) {
        const additions = generateRequirementAwareQuestions({ job: updatedJob, requirements, existingFields: target.fields })
        const updatedForm = { ...target, fields: [...target.fields, ...additions.map((item) => item.field)], requirementFingerprint: createJobRequirementFingerprint(updatedJob), updatedAt: timestamp }
        dispatch(draft ? { type: 'UPDATE_APPLICATION_FORM', payload: updatedForm } : { type: 'ADD_APPLICATION_FORM', payload: updatedForm })
      }
    }
    navigate(`/jobs/${jobId}/setup?step=form`)
  }
  return <JobEditorForm initialValue={jobToDraftInput(job)} submitLabel="Save requirements and continue" onSubmit={save} onCancel={() => navigate(`/jobs/${jobId}`)} />
}

import { useNavigate } from 'react-router-dom'
import { JobEditorForm } from '../../components/jobs/JobEditorForm'
import { PageContainer } from '../../components/layout/PageContainer'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { Job } from '../../types/job'
import type { JobDraftInput } from '../../types/jobDraft'
import { createNextJobId, draftSkillsToRequirements } from '../../utils/jobValidation'

const initialValue: JobDraftInput = { title: '', department: '', description: '', positionsCount: 1, employmentType: 'FULL_TIME', workArrangement: 'HYBRID', location: '', minimumExperienceYears: 0, requiredSkills: [], preferredSkills: [], applicationDeadline: '' }

export default function JobCreate() {
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  function create(input: JobDraftInput) {
    const timestamp = new Date().toISOString()
    const job: Job = { id: createNextJobId(state.jobs), title: input.title.trim(), department: input.department.trim(), description: input.description.trim(), status: 'DRAFT', positionsCount: input.positionsCount, employmentType: input.employmentType, workArrangement: input.workArrangement, ...(input.location.trim() ? { location: input.location.trim() } : {}), minimumExperienceYears: input.minimumExperienceYears, requiredSkills: draftSkillsToRequirements(input), ...(input.applicationDeadline ? { applicationDeadline: input.applicationDeadline } : {}), createdAt: timestamp, updatedAt: timestamp }
    dispatch({ type: 'ADD_JOB', payload: { job } })
    navigate(`/jobs/${job.id}/setup?step=requirements`)
  }
  return <PageContainer eyebrow="Job setup" title="Create job opening" description="Define the role, hiring requirements, and application timeline."><JobEditorForm initialValue={initialValue} submitLabel="Create draft job" onSubmit={create} onCancel={() => navigate('/jobs')} /></PageContainer>
}

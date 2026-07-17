import { useNavigate } from 'react-router-dom'
import { JobEditorForm } from '../../components/jobs/JobEditorForm'
import { PageContainer } from '../../components/layout/PageContainer'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { Job } from '../../types/job'
import type { JobDraftInput } from '../../types/jobDraft'
import { createNextJobId, draftSkillsToRequirements } from '../../utils/jobValidation'

const initialValue: JobDraftInput = { title: '', department: '', description: '', positionsCount: 1, employmentType: 'FULL_TIME', workArrangement: 'HYBRID', location: '', minimumExperienceYears: 0, requiredSkills: [], preferredSkills: [], applicationDeadline: '' }

export function CreateJobStepsHeader() {
  const steps = [
    { number: 1, name: 'Role definition', active: true },
    { number: 2, name: 'Application form', active: false },
    { number: 3, name: 'Screening criteria', active: false },
    { number: 4, name: 'Review & publish', active: false },
  ]
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 rounded-aura-md border border-[#1E2022]/10 bg-white p-4 shadow-aura-xs md:grid-cols-4 animate-fade-in">
      {steps.map((step) => (
        <div key={step.number} className="flex items-center gap-3">
          <span className={`inline-grid size-7 place-items-center rounded-full text-xs font-bold transition-all ${
            step.active 
              ? 'bg-[#C7FF38] text-[#1E2022] ring-4 ring-[#C7FF38]/20' 
              : 'bg-[#F4F1EA] text-[#1E2022]/40'
          }`}>
            {step.number}
          </span>
          <span className={`text-xs font-semibold ${step.active ? 'text-[#1E2022]' : 'text-[#1E2022]/40'}`}>
            {step.name}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function JobCreate() {
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  function create(input: JobDraftInput) {
    const timestamp = new Date().toISOString()
    const job: Job = { id: createNextJobId(state.jobs), title: input.title.trim(), department: input.department.trim(), description: input.description.trim(), status: 'DRAFT', positionsCount: input.positionsCount, employmentType: input.employmentType, workArrangement: input.workArrangement, ...(input.location.trim() ? { location: input.location.trim() } : {}), minimumExperienceYears: input.minimumExperienceYears, requiredSkills: draftSkillsToRequirements(input), ...(input.applicationDeadline ? { applicationDeadline: input.applicationDeadline } : {}), createdAt: timestamp, updatedAt: timestamp }
    dispatch({ type: 'ADD_JOB', payload: { job } })
    navigate(`/jobs/${job.id}/setup?step=requirements`)
  }
  return (
    <PageContainer eyebrow="Job setup" title="Create job opening" description="Define the role, hiring requirements, and application timeline.">
      <CreateJobStepsHeader />
      <JobEditorForm initialValue={initialValue} submitLabel="Create draft job" onSubmit={create} onCancel={() => navigate('/jobs')} />
    </PageContainer>
  )
}

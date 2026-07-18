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
    { number: 1, name: 'Role' },
    { number: 2, name: 'Application form' },
    { number: 3, name: 'Screening criteria' },
    { number: 4, name: 'Review & publish' },
  ]
  const currentStepIndex = 0
  const chevronDepth = '18px'
  return (
    <div className="-mx-5 mb-6 overflow-x-auto border-b border-harbor/10 bg-frost px-5 py-5 md:-mx-8 md:px-8 xl:-mx-10 xl:px-10 animate-fade-in">
      <ol className="flex min-w-[760px] overflow-visible drop-shadow-[0_10px_24px_rgba(30,32,34,0.08)]" aria-label="Job creation progress">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex
          const isComplete = index < currentStepIndex
          const clipPath = `polygon(0 0, calc(100% - ${chevronDepth}) 0, 100% 50%, calc(100% - ${chevronDepth}) 100%, 0 100%, ${chevronDepth} 50%)`
          return (
          <li
            key={step.number}
            className={`relative flex h-11 flex-1 items-center justify-center px-8 text-center ${index > 0 ? '-ml-3' : ''}`}
            style={{ clipPath, zIndex: steps.length - index }}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="absolute inset-0 bg-harbor/15" style={{ clipPath }} aria-hidden="true" />
            <span className={`absolute inset-[1px] ${isComplete ? 'bg-[#9FEA30]' : isActive ? 'bg-glacier' : 'bg-[#F7F8F4]'}`} style={{ clipPath }} aria-hidden="true" />
            <span className={`relative z-10 text-xs font-bold uppercase tracking-[0.12em] ${isActive || isComplete ? 'text-depth' : 'text-aura-text-muted'}`}>
              <span className="sr-only">Step {step.number}: </span>
              {step.name}
            </span>
          </li>
          )
        })}
      </ol>
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
    <PageContainer eyebrow="" title="Create job opening">
      <CreateJobStepsHeader />
      <JobEditorForm
        initialValue={initialValue}
        submitLabel="Create draft job"
        onSubmit={create}
        onCancel={() => navigate('/jobs')}
        sectionTitles={{ overview: 'Job Overview', requiredSkills: 'Job Requirement', preferredSkills: 'Soft Skill' }}
      />
    </PageContainer>
  )
}

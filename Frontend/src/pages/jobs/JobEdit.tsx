import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { JobEditorForm } from '../../components/jobs/JobEditorForm'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/ui/Card'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { JobDraftInput } from '../../types/jobDraft'
import { draftSkillsToRequirements, jobToDraftInput } from '../../utils/jobValidation'

const normalize = (values: string[]) => values.map((value) => value.trim().toLocaleLowerCase()).sort().join('|')

export default function JobEdit() {
  const { jobId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const navigate = useNavigate()
  const job = state.jobs.find((item) => item.id === jobId)
  const [requirementsChanged, setRequirementsChanged] = useState(false)
  if (!job) return <PageContainer eyebrow="Job setup" title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening could not be resolved.</Card></PageContainer>
  const initial = jobToDraftInput(job)
  function save(input: JobDraftInput) {
    const changed = normalize(input.requiredSkills) !== normalize(initial.requiredSkills) || normalize(input.preferredSkills) !== normalize(initial.preferredSkills)
    if (changed && job!.status === 'OPEN' && !requirementsChanged) { setRequirementsChanged(true); return }
    dispatch({ type: 'UPDATE_JOB', payload: { jobId: job!.id, changes: { title: input.title.trim(), department: input.department.trim(), description: input.description.trim(), positionsCount: input.positionsCount, employmentType: input.employmentType, workArrangement: input.workArrangement, location: input.location.trim() || undefined, minimumExperienceYears: input.minimumExperienceYears, requiredSkills: draftSkillsToRequirements(input, job!.requiredSkills), applicationDeadline: input.applicationDeadline || undefined }, updatedAt: new Date().toISOString() } })
    navigate(`/jobs/${job!.id}`)
  }
  return <PageContainer eyebrow="Job setup" title={`Edit ${job.title}`}><JobEditorForm initialValue={initial} submitLabel={requirementsChanged ? 'Save and keep existing setup' : 'Save changes'} onSubmit={save} onCancel={() => navigate(`/jobs/${job.id}`)} requirementsWarning={requirementsChanged} /></PageContainer>
}

import { Link } from 'react-router-dom'
import type { Candidate } from '../../types/candidate'
import type { Job } from '../../types/job'
import { Card } from '../ui/Card'

export function InterviewCandidateContext({ candidate, job }: { candidate: Candidate; job: Job }) {
  const required = job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED').map((skill) => skill.name)
  return <Card className="p-5"><h2 className="m-0 text-base font-semibold text-depth">Candidate context</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-xs text-aura-text-muted">Candidate</dt><dd className="mb-0 mt-1 font-semibold text-depth">{candidate.fullName}</dd><dd className="m-0 text-aura-text-secondary">{candidate.currentPosition} · {candidate.yearsExperience} years</dd></div><div><dt className="text-xs text-aura-text-muted">Applied role</dt><dd className="mb-0 mt-1 font-semibold text-depth">{job.title}</dd></div><div><dt className="text-xs text-aura-text-muted">Required skills</dt><dd className="mb-0 mt-1 leading-5 text-depth">{required.join(', ') || 'No required skills specified'}</dd></div><div><dt className="text-xs text-aura-text-muted">Candidate skills</dt><dd className="mb-0 mt-1 leading-5 text-depth">{candidate.skills.join(', ') || 'None listed'}</dd></div></dl><Link className="mt-4 inline-flex text-sm font-semibold text-harbor" to={`/candidates/${candidate.id}`}>Open full candidate profile</Link></Card>
}

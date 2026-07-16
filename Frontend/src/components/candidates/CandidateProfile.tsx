import { Mail, MapPin, Phone } from 'lucide-react'
import type { Candidate } from '../../types/candidate'
import type { Application } from '../../types/application'
import type { Job } from '../../types/job'
import { formatApplicationStage, formatApplicationStatus } from '../../utils/helpers'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

type CandidateProfileProps = {
  candidate: Candidate
  application: Application
  job: Job
}

export function CandidateProfile({ candidate, application, job }: CandidateProfileProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-start md:p-6">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{formatApplicationStage(application.currentStage)}</Badge>
            <Badge>{formatApplicationStatus(application.status)}</Badge>
          </div>
          <h2 className="m-0 text-xl font-semibold tracking-[-0.015em] text-depth">{candidate.currentPosition}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-aura-text-secondary">
            <span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />{candidate.location}</span>
            <span aria-hidden="true">·</span>
            <span>{candidate.yearsExperience} years experience</span>
          </p>
        </div>
        <div className="grid gap-2 text-sm md:min-w-64">
          <div className="flex items-center gap-2 text-aura-text-secondary"><Mail size={15} className="text-marine" aria-hidden="true" /><a className="text-inherit hover:text-depth" href={`mailto:${candidate.email}`}>{candidate.email}</a></div>
          <div className="flex items-center gap-2 text-aura-text-secondary"><Phone size={15} className="text-marine" aria-hidden="true" /><a className="text-inherit hover:text-depth" href={`tel:${candidate.phone}`}>{candidate.phone}</a></div>
        </div>
      </div>
      <div className="border-t border-harbor/10 bg-frost/60 px-5 py-3 md:px-6">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted">Applied role</span>
        <span className="ml-3 text-sm font-semibold text-depth">{job.title}</span>
      </div>
    </Card>
  )
}

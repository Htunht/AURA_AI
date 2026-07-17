import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Candidate } from '../../types/candidate'
import type { Application } from '../../types/application'
import type { Job } from '../../types/job'
import { formatApplicationStage } from '../../utils/helpers'
import { Badge } from '../ui/Badge'

type CandidateProfileProps = {
  candidate: Candidate
  application: Application
  job: Job
  applicationSelector?: ReactNode
  progress?: ReactNode
  operationalLabel?: string
}

export function CandidateProfile({ candidate, application, job, applicationSelector, progress, operationalLabel }: CandidateProfileProps) {
  const stage = formatApplicationStage(application.currentStage)
  const stageTone = application.currentStage === 'SELECTED'
    ? 'success'
    : application.currentStage === 'REJECTED'
      ? 'danger'
      : application.currentStage === 'HOLD'
        ? 'warning'
        : 'accent'

  return (
    <section className="mb-3 overflow-hidden rounded-aura-md bg-white shadow-aura-sm" aria-labelledby="candidate-profile-name">
      <div className="px-5 py-5 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Candidate profile</p>
          <Link className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-harbor no-underline hover:text-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier" to="/candidates"><ArrowLeft size={14} aria-hidden="true" />Candidates</Link>
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 id="candidate-profile-name" className="m-0 text-2xl font-bold tracking-[-0.025em] text-depth md:text-[28px]">{candidate.fullName}</h1>
              <Badge tone={stageTone}>{stage}</Badge>
            </div>
            <p id="candidate-application-context" className="mb-0 mt-1 text-base font-semibold text-harbor">{job.title}</p>
            {operationalLabel ? <p className="mb-0 mt-1 text-xs font-medium text-aura-warning">{operationalLabel}</p> : null}
          </div>
          <dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-aura-text-secondary lg:justify-end">
            <div><dt className="sr-only">Location</dt><dd className="m-0 flex items-center gap-1.5"><MapPin size={13} className="text-marine" aria-hidden="true" />{candidate.location}</dd></div>
            <div><dt className="sr-only">Experience</dt><dd className="m-0">{candidate.yearsExperience} years experience</dd></div>
            <div><dt className="sr-only">Email</dt><dd className="m-0 flex items-center gap-1.5"><Mail size={13} className="text-marine" aria-hidden="true" /><a className="text-inherit hover:text-depth" href={`mailto:${candidate.email}`}>{candidate.email}</a></dd></div>
            <div><dt className="sr-only">Phone</dt><dd className="m-0 flex items-center gap-1.5"><Phone size={13} className="text-marine" aria-hidden="true" /><a className="text-inherit hover:text-depth" href={`tel:${candidate.phone}`}>{candidate.phone}</a></dd></div>
          </dl>
        </div>
      </div>
      {applicationSelector ? <div className="border-t border-harbor/10 bg-frost/35 px-5 py-3 md:px-6">{applicationSelector}</div> : null}
      {progress}
    </section>
  )
}

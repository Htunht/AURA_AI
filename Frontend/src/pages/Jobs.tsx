import { ArrowRight, ExternalLink, FilePenLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectApplicationFormsByJobId } from '../store/demoSelectors'
import type { ApplicationFormStatus } from '../types/applicationForm'

function jobStatusTone(status: string) {
  return status === 'OPEN' ? 'success' : status === 'DRAFT' ? 'warning' : 'neutral'
}

function formStatusTone(status?: ApplicationFormStatus) {
  return status === 'PUBLISHED'
    ? 'accent'
    : status === 'DRAFT'
      ? 'warning'
      : 'neutral'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

const linkClass =
  'inline-flex items-center gap-1.5 text-sm font-semibold text-harbor transition-colors duration-150 hover:text-depth'

export default function Jobs() {
  const { state } = useDemoStore()

  return (
    <PageContainer
      title="Job openings"
      description="Manage application entry points for each active hiring process."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {state.jobs.map((job) => {
          const forms = selectApplicationFormsByJobId(state, job.id)
          const activeForm =
            forms.find((form) => form.status === 'PUBLISHED') ??
            forms.find((form) => form.status === 'DRAFT') ??
            forms[0]

          return (
            <Card
              className="group flex flex-col gap-5 p-5 transition-colors duration-150 hover:border-marine/35 hover:shadow-aura-sm md:p-6"
              key={job.id}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
                  {job.department}
                </span>
                <Badge tone={jobStatusTone(job.status)}>{job.status}</Badge>
              </div>

              <div className="grid gap-2">
                <h2 className="m-0 text-lg font-semibold tracking-[-0.01em] text-depth">
                  {job.title}
                </h2>
                <p className="m-0 line-clamp-2 text-sm leading-6 text-aura-text-secondary">
                  {job.description}
                </p>
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-aura-sm border border-harbor/10 bg-frost/70 px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-aura-text-muted">
                    Positions
                  </dt>
                  <dd className="mt-1 m-0 text-sm font-semibold text-depth">
                    {job.positionsCount}
                  </dd>
                </div>
                <div className="rounded-aura-sm border border-harbor/10 bg-frost/70 px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-aura-text-muted">
                    Deadline
                  </dt>
                  <dd className="mt-1 m-0 text-sm font-semibold text-depth">
                    {formatDate(job.applicationDeadline)}
                  </dd>
                </div>
                <div className="rounded-aura-sm border border-harbor/10 bg-white px-3 py-2.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-aura-text-muted">
                    Application form
                  </dt>
                  <dd className="mt-1 m-0 flex flex-wrap items-center gap-2 text-sm font-semibold text-depth">
                    <Badge tone={formStatusTone(activeForm?.status)}>
                      {activeForm?.status ?? 'Not configured'}
                    </Badge>
                    <span className="text-xs text-aura-text-muted">
                      {activeForm ? `${activeForm.fields.length} fields` : '0 fields'}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-harbor/10 pt-4">
                <Link className={linkClass} to={`/jobs/${job.id}`}>
                  <ArrowRight size={16} />
                  View details
                </Link>
                <Link
                  className={linkClass}
                  to={`/jobs/${job.id}/application-form`}
                >
                  <FilePenLine size={16} />
                  Manage form
                </Link>
                <Link className={linkClass} to={`/apply/${job.id}`}>
                  <ExternalLink size={16} />
                  Open application
                </Link>
              </div>
            </Card>
          )
        })}
      </div>
    </PageContainer>
  )
}

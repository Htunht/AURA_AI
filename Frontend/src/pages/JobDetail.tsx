import { ExternalLink, FilePenLine } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import {
  selectApplicationFormsByJobId,
  selectJobById,
} from '../store/demoSelectors'
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

const actionLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-transparent px-4 text-sm font-semibold text-[#446e87] no-underline transition-all shadow-[0_0_8px_rgba(114,163,191,0.25)] hover:bg-[#72a3bf]/15 hover:shadow-[0_0_14px_rgba(114,163,191,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

const primaryLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#72a3bf] bg-[#72a3bf] px-4 text-sm font-semibold text-[#1D4052] no-underline transition-all shadow-[0_0_10px_rgba(114,163,191,0.45)] hover:bg-[#5b8da8] hover:shadow-[0_0_16px_rgba(114,163,191,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72a3bf]'

export default function JobDetail() {
  const { jobId = '' } = useParams()
  const { state } = useDemoStore()
  const job = selectJobById(state, jobId)

  if (!job) {
    return (
      <PageContainer title="Job not found">
        <Card className="p-8 text-center">
          <p className="m-0 text-sm text-aura-text-secondary">
            The requested job opening does not exist.
          </p>
        </Card>
      </PageContainer>
    )
  }

  const requiredSkills = job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED')
  const preferredSkills = job.requiredSkills.filter((skill) => skill.priority === 'PREFERRED')
  const forms = selectApplicationFormsByJobId(state, job.id)
  const activeForm =
    forms.find((form) => form.status === 'PUBLISHED') ??
    forms.find((form) => form.status === 'DRAFT') ??
    forms[0]

  return (
    <PageContainer
      title={job.title}
      description={`${job.department} · ${job.positionsCount} open position${job.positionsCount === 1 ? '' : 's'}`}
      actions={
        <>
          <Link className={actionLinkClass} to={`/apply/${job.id}`}>
            <ExternalLink size={16} />
            Open application
          </Link>
          <Link
            className={primaryLinkClass}
            to={`/jobs/${job.id}/application-form`}
          >
            <FilePenLine size={16} />
            Manage form
          </Link>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="p-5 md:p-6 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="m-0 text-xl font-semibold tracking-[-0.01em] text-depth">
              Job overview
            </h2>
            <Badge tone={jobStatusTone(job.status)}>{job.status}</Badge>
          </div>
          <p className="m-0 max-w-4xl text-sm leading-6 text-aura-text-secondary md:text-[15px]">
            {job.description}
          </p>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="m-0 text-lg font-semibold text-depth">Hiring details</h2>
          <dl className="mt-4 grid gap-3">
            {[
              ['Department', job.department],
              ['Positions', String(job.positionsCount)],
              ['Application deadline', formatDate(job.applicationDeadline)],
            ].map(([label, value]) => (
              <div
                className="flex items-baseline justify-between gap-5 border-b border-harbor/10 pb-3 last:border-b-0 last:pb-0"
                key={label}
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-aura-text-muted">
                  {label}
                </dt>
                <dd className="m-0 text-sm font-semibold text-depth">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="m-0 text-lg font-semibold text-depth">
            Application setup
          </h2>
          <dl className="mt-4 grid gap-3">
            <div className="flex items-center justify-between gap-5 border-b border-harbor/10 pb-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-aura-text-muted">
                Form status
              </dt>
              <dd className="m-0">
                <Badge tone={formStatusTone(activeForm?.status)}>
                  {activeForm?.status ?? 'Not configured'}
                </Badge>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-5 border-b border-harbor/10 pb-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-aura-text-muted">
                Version
              </dt>
              <dd className="m-0 text-sm font-semibold text-depth">
                {activeForm ? `Version ${activeForm.version}` : 'Not available'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-aura-text-muted">
                Field count
              </dt>
              <dd className="m-0 text-sm font-semibold text-depth">
                {activeForm?.fields.length ?? 0}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="m-0 text-lg font-semibold text-depth">Requirements</h2>
          <ul className="mt-4 grid gap-2 p-0">
            {requiredSkills.map((skill) => (
              <li
                className="flex items-center justify-between gap-3 border-b border-harbor/10 py-2 text-sm text-depth last:border-b-0"
                key={skill.name}
              >
                <span>{skill.name}</span>
                <Badge>Required</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="m-0 text-lg font-semibold text-depth">
            Preferred skills
          </h2>
          <ul className="mt-4 grid gap-2 p-0">
            {preferredSkills.map((skill) => (
              <li
                className="flex items-center justify-between gap-3 border-b border-harbor/10 py-2 text-sm text-depth last:border-b-0"
                key={skill.name}
              >
                <span>{skill.name}</span>
                <Badge tone="neutral">Preferred</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageContainer>
  )
}

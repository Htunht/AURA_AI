import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import logo from '../assets/logo.png'
import { DynamicFormField } from '../components/forms/DynamicFormField'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import { prepareApplicationSubmission, type PreparedApplicationSubmission } from '../services/applicationSubmission'
import { selectJobById, selectPublishedApplicationFormByJobId } from '../store/demoSelectors'
import type { ApplicationSubmissionValue, CandidateSubmission } from '../types/application'
import { validateApplicationSubmission } from '../utils/applicationSubmissionValidation'
import { canAcceptPublicApplications } from '../utils/jobValidation'

const DEMO_TIMESTAMP = '2026-07-16T10:30:00Z'

export default function PublicJobApplication() {
  const { jobId = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const [values, setValues] = useState<Record<string, ApplicationSubmissionValue | undefined>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [submitted, setSubmitted] = useState<PreparedApplicationSubmission>()
  const job = selectJobById(state, jobId)
  const form = selectPublishedApplicationFormByJobId(state, jobId)

  if (!job) {
    return <PublicUnavailable title="Job not found" message="This job opening does not exist." />
  }

  if (!canAcceptPublicApplications(job, Boolean(form)) && job.status !== 'OPEN') {
    const message = job.status === 'DRAFT'
      ? 'This role is not open for applications.'
      : job.status === 'CLOSED'
        ? 'Applications for this role are now closed.'
        : 'This role is no longer available.'
    return <PublicUnavailable title={job.title} message={message} />
  }

  if (!form) {
    return <PublicUnavailable title={job.title} message="Applications are not currently available." />
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-frost px-5 py-8">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[620px] place-items-center">
          <Card className="w-full p-8 text-center shadow-aura-md md:p-10">
            <CheckCircle2
              className="mx-auto mb-4 text-aura-success"
              size={42}
              aria-hidden="true"
            />
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
              Application received
            </p>
            <h1 className="m-0 text-[26px] font-bold leading-tight text-depth md:text-[30px]">
              Thank you, {submitted.candidate.fullName}.
            </h1>
            <p className="mt-3 mb-0 text-sm leading-6 text-aura-text-secondary">
              Your application for {job.title} has been submitted. The hiring
              team will review your information.
            </p>
            <dl className="my-6 rounded-aura-sm border border-harbor/10 bg-frost/70 px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-aura-text-muted">
                Application reference
              </dt>
              <dd className="mt-1 m-0 font-utility text-xs font-semibold text-harbor">
                {submitted.application.id}
              </dd>
            </dl>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-aura-sm border border-[#72a3bf] bg-[#72a3bf] px-4 text-sm font-semibold text-[#1D4052] no-underline transition-all shadow-[0_0_10px_rgba(114,163,191,0.45)] hover:bg-[#5b8da8] hover:shadow-[0_0_16px_rgba(114,163,191,0.65)] duration-150"
              to="/jobs"
            >
              View open roles
            </Link>
          </Card>
        </section>
      </main>
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submission: CandidateSubmission = {
      formId: form.id,
      jobId: job.id,
      answers: form.fields
        .filter((field) => values[field.id] !== undefined)
        .map((field) => ({
          fieldId: field.id,
          fieldKey: field.key,
          fieldType: field.type,
          value: values[field.id] ?? '',
        })),
    }
    const validation = validateApplicationSubmission(form, submission)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    const emailField = form.fields.find((field) => field.key === 'email')
    const emailValue = emailField ? values[emailField.id] : undefined
    const normalizedEmail = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : ''
    const existingCandidate = state.candidates.find((candidate) => candidate.email.toLowerCase() === normalizedEmail)
    const duplicateApplication = existingCandidate
      ? state.applications.some((application) => application.candidateId === existingCandidate.id && application.jobId === job.id)
      : false

    if (duplicateApplication) {
      setErrors(['An application already exists for this email and job.'])
      return
    }

    const sequence = String(
      Math.max(state.candidates.length, state.applications.length) + 1,
    ).padStart(3, '0')
    try {
      const prepared = prepareApplicationSubmission({
        form,
        submission,
        existingCandidates: state.candidates,
        candidateId: `candidate-demo-${sequence}`,
        applicationId: `application-demo-${sequence}`,
        documentId: `document-demo-${sequence}-cv`,
        submittedAt: DEMO_TIMESTAMP,
      })

      dispatch({
        type: existingCandidate ? 'UPDATE_CANDIDATE' : 'ADD_CANDIDATE',
        payload: prepared.candidate,
      })
      dispatch({ type: 'ADD_APPLICATION', payload: prepared.application })
      dispatch({
        type: 'QUEUE_SCREENING_APPLICATION',
        payload: {
          applicationId: prepared.application.id,
          queuedAt: prepared.application.submittedAt,
        },
      })
      setSubmitted(prepared)
      setErrors([])
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Application submission failed.'])
    }
  }

  return (
    <main className="min-h-screen bg-frost px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-[880px] items-center justify-between py-2 pb-6 text-sm text-aura-text-muted">
        <Link
          to="/jobs"
          className="flex items-center gap-3 font-semibold text-depth no-underline"
        >
          <img src={logo} alt="AURA Logo" className="size-8 flex-none object-contain" />
          <span>AURA Technology</span>
        </Link>
        <span>Careers</span>
      </header>
      <section className="mx-auto max-w-[880px] pb-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
          Careers at AURA Technology
        </p>
        <h1 className="m-0 text-[28px] font-bold leading-tight text-depth md:text-[32px]">
          Apply for this role
        </h1>
        <p className="mt-2 mb-0 text-sm text-aura-text-secondary md:text-[15px]">
          {job.title} · {job.department} · {job.positionsCount} position
          {job.positionsCount === 1 ? '' : 's'}
        </p>
      </section>
      <Card className="mx-auto max-w-[880px] rounded-aura-lg p-5 shadow-aura-sm md:p-8">
        <header className="border-b border-harbor/15 pb-5">
          <h2 className="m-0 text-xl font-semibold text-depth">{form.name}</h2>
          <p className="mt-2 mb-0 text-sm leading-6 text-aura-text-secondary">
            {form.description ?? 'Complete the fields below. Required fields are marked clearly.'}
          </p>
        </header>
        {errors.length > 0 ? (
          <div
            className="mt-4 rounded-aura-sm border border-aura-danger/30 bg-aura-danger-soft px-4 py-3 text-sm text-aura-danger"
            role="alert"
          >
            <strong>Review your application</strong>
            <ul className="mt-2 mb-0 pl-5">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        ) : null}
        <form className="mt-6 grid gap-6" onSubmit={handleSubmit} noValidate>
          <div className="grid gap-x-5 gap-y-6 md:grid-cols-2 [&>div:has(textarea)]:md:col-span-2 [&>div:has(input[type='file'])]:md:col-span-2 [&>div:has(div[aria-describedby])]:md:col-span-2">
            {form.fields.map((field) => (
              <DynamicFormField
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-harbor/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-harbor no-underline transition-colors duration-150 hover:text-depth"
              to="/jobs"
            >
              <ArrowLeft size={16} />
              Back to job openings
            </Link>
            <Button type="submit">Submit application</Button>
          </div>
        </form>
      </Card>
    </main>
  )
}

function PublicUnavailable({ title, message }: { title: string; message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-frost px-5 py-8">
      <section className="w-full max-w-[570px] rounded-aura-lg border border-harbor/15 bg-white p-8 text-center shadow-aura-md">
        <img src={logo} alt="AURA Logo" className="mx-auto mb-5 h-9 w-auto object-contain" />
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
          Careers at AURA Technology
        </p>
        <h1 className="m-0 text-[26px] font-bold leading-tight text-depth">
          {title}
        </h1>
        <p className="mt-3 mb-0 text-sm leading-6 text-aura-text-secondary">
          {message}
        </p>
        <Link
          className="mt-6 inline-flex h-10 items-center justify-center rounded-aura-sm border border-[#72a3bf] bg-transparent px-4 text-sm font-semibold text-[#446e87] no-underline transition-all shadow-[0_0_8px_rgba(114,163,191,0.25)] hover:bg-[#72a3bf]/15 hover:shadow-[0_0_14px_rgba(114,163,191,0.45)] duration-150"
          to="/jobs"
        >
          Back to job openings
        </Link>
      </section>
    </main>
  )
}

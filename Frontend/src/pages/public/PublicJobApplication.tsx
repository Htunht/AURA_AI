import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import logo from '../../assets/logo.png'
import { DynamicFormField } from '../../components/forms/DynamicFormField'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { backendWorkspaceMode } from '../../config/workspaceMode'
import { useDemoStore } from '../../hooks/useDemoStore'
import { API_BASE_URL } from '../../services/api'
import { getPublicBackendApplicationForm } from '../../services/backendRecruiterApi'
import { prepareApplicationSubmission, submitApplicationToBackend, type BackendApplicationSubmissionReceipt, type PreparedApplicationSubmission } from '../../services/applicationSubmission'
import { selectJobById, selectPublishedApplicationFormByJobId } from '../../store/demoSelectors'
import type { ApplicationSubmissionValue, CandidateSubmission } from '../../types/application'
import type { ApplicationForm, ApplicationFormField } from '../../types/applicationForm'
import { validateApplicationSubmission } from '../../utils/applicationSubmissionValidation'
import { isBackendUuid, isDemoId } from '../../utils/backendIds'
import { canAcceptPublicApplications } from '../../utils/jobValidation'
import { normalizeUrlFieldValue } from '../../utils/urlFieldValidation'

export default function PublicJobApplication() {
  const { jobId = '' } = useParams()
  if (backendWorkspaceMode && !isDemoId(jobId)) return <BackendPublicJobApplication jobId={jobId} />
  return <DemoPublicJobApplication jobId={jobId} />
}

function DemoPublicJobApplication({ jobId }: { jobId: string }) {
  const { state, dispatch } = useDemoStore()
  const [values, setValues] = useState<Record<string, ApplicationSubmissionValue | undefined>>({})
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<PreparedApplicationSubmission>()
  const [backendReceipt, setBackendReceipt] = useState<BackendApplicationSubmissionReceipt>()
  const [candidateStatus, setCandidateStatus] = useState<string>()
  const job = selectJobById(state, jobId)
  const form = selectPublishedApplicationFormByJobId(state, jobId)

  useEffect(() => {
    if (!backendReceipt?.status_token) return

    localStorage.setItem(
      `aura-application-receipt-${backendReceipt.application_id}`,
      JSON.stringify(backendReceipt),
    )

    const pollStatus = async () => {
      const params = new URLSearchParams({ status_token: backendReceipt.status_token })
      const response = await fetch(`${API_BASE_URL}/applications/${backendReceipt.application_id}/submission-status?${params.toString()}`)
      if (!response.ok) return
      const body = await response.json() as { message?: string }
      setCandidateStatus(body.message)
    }

    void pollStatus()
    const intervalId = window.setInterval(() => void pollStatus(), 3000)
    return () => window.clearInterval(intervalId)
  }, [backendReceipt])

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

  if (submitted || backendReceipt) {
    return (
      <main className="min-h-screen bg-frost px-5 py-8">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[620px] place-items-center">
          <SubmissionConfirmation
            heading={`Thank you, ${submitted?.candidate.fullName ?? 'your application has been received'}.`}
            message={backendReceipt?.message ?? `Your application for ${job.title} has been submitted. The hiring team will review your information.`}
            referenceLabel="Application reference"
            referenceValue={submitted?.application.id ?? backendReceipt?.application_id}
            status={candidateStatus}
          />
        </section>
      </main>
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedValues = form.fields.reduce<Record<string, ApplicationSubmissionValue | undefined>>((accumulator, field) => {
      const value = values[field.id]
      if (field.type === 'URL' && typeof value === 'string') {
        const normalized = normalizeUrlFieldValue(field, value)
        accumulator[field.id] = normalized.valid ? normalized.value : value.trim()
        return accumulator
      }
      accumulator[field.id] = value
      return accumulator
    }, {})
    const submission: CandidateSubmission = {
      formId: form.id,
      jobId: job.id,
      answers: form.fields
        .filter((field) => normalizedValues[field.id] !== undefined)
        .map((field) => ({
          fieldId: field.id,
          fieldKey: field.key,
          fieldType: field.type,
          value: normalizedValues[field.id] ?? '',
        })),
    }
    const validation = validateApplicationSubmission(form, submission)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setValues(normalizedValues)

    if (backendWorkspaceMode && isBackendUuid(job.id)) {
      setIsSubmitting(true)
      setErrors([])
      try {
        const answerFields = new Set(['full_name', 'email', 'phone', 'cv', 'github_repository_url', 'github_url', 'repository_url'])
        const readString = (key: string) => {
          const field = form.fields.find((item) => item.key === key)
          const value = field ? normalizedValues[field.id] : undefined
          return typeof value === 'string' ? value.trim() : ''
        }
        const githubUrl = readString('github_repository_url') || readString('github_url') || readString('repository_url')
        const cvField = form.fields.find((field) => field.type === 'FILE')
        const receipt = await submitApplicationToBackend({
          jobId: job.id,
          candidateFullName: readString('full_name'),
          candidateEmail: readString('email'),
          candidatePhone: readString('phone'),
          githubRepositoryUrl: githubUrl || undefined,
          cvFile: cvField ? files[cvField.id] : undefined,
          idempotencyKey: crypto.randomUUID(),
          answers: form.fields
            .filter((field) => !answerFields.has(field.key))
            .map((field) => {
              const answerValue = normalizedValues[field.id]

              return {
                question_key: field.key,
                question_label: field.label,
                answer_text: Array.isArray(answerValue)
                  ? answerValue.join(', ')
                  : String(answerValue ?? ''),
                linked_requirement_codes: field.screeningMapping?.requirementIds ?? [],
              }
            }),
        })
        setBackendReceipt(receipt)
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Application submission failed.'])
      } finally {
        setIsSubmitting(false)
      }
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
        submittedAt: new Date().toISOString(),
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
                onFileChange={(file) => setFiles((current) => ({ ...current, [field.id]: file }))}
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
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Submitting...' : 'Submit application'}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  )
}

function BackendPublicJobApplication({ jobId }: { jobId: string }) {
  const [form, setForm] = useState<ApplicationForm>()
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, ApplicationSubmissionValue | undefined>>({})
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [backendReceipt, setBackendReceipt] = useState<BackendApplicationSubmissionReceipt>()
  const [candidateStatus, setCandidateStatus] = useState<string>()
  const invalidBackendJobId = isDemoId(jobId) || !isBackendUuid(jobId)

  useEffect(() => {
    if (invalidBackendJobId) {
      setLoading(false)
      return
    }
    async function load() {
      try {
        const response = await getPublicBackendApplicationForm(jobId)
        setJobTitle(response.title)
        setDepartment(response.department)
        setForm({
          id: `backend-form-${response.job_id}`,
          jobId: response.job_id,
          name: `${response.title} application`,
          description: response.description,
          status: 'PUBLISHED',
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fields: response.fields.map((field): ApplicationFormField => ({
            id: field.id,
            key: field.key,
            label: field.label,
            type: field.type as ApplicationFormField['type'],
            required: field.required,
            placeholder: field.placeholder ?? undefined,
            helpText: field.helpText ?? undefined,
            options: field.options,
            screeningMapping: field.linkedRequirementCodes.length ? { requirementIds: field.linkedRequirementCodes, criterionKeys: [], evidenceImportance: field.required ? 'REQUIRED' : 'SUPPORTING' } : undefined,
          })),
        })
      } catch (error) {
        setErrors([error instanceof Error ? error.message : 'Could not load backend application form.'])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [invalidBackendJobId, jobId])

  useEffect(() => {
    if (!backendReceipt?.status_token) return
    localStorage.setItem(`aura-backend-application-receipt-${backendReceipt.application_id}`, JSON.stringify(backendReceipt))
    const pollStatus = async () => {
      const params = new URLSearchParams({ status_token: backendReceipt.status_token })
      const response = await fetch(`${API_BASE_URL}/applications/${backendReceipt.application_id}/submission-status?${params.toString()}`)
      if (!response.ok) return
      const body = await response.json() as { message?: string }
      setCandidateStatus(body.message)
    }
    void pollStatus()
    const intervalId = window.setInterval(() => void pollStatus(), 3000)
    return () => window.clearInterval(intervalId)
  }, [backendReceipt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) return
    const normalizedValues = form.fields.reduce<Record<string, ApplicationSubmissionValue | undefined>>((accumulator, field) => {
      const value = values[field.id]
      if (field.type === 'URL' && typeof value === 'string') {
        const normalized = normalizeUrlFieldValue(field, value)
        accumulator[field.id] = normalized.valid ? normalized.value : value.trim()
        return accumulator
      }
      accumulator[field.id] = value
      return accumulator
    }, {})
    const submission: CandidateSubmission = {
      formId: form.id,
      jobId: form.jobId,
      answers: form.fields.filter((field) => normalizedValues[field.id] !== undefined || field.required).map((field) => ({
        fieldId: field.id,
        fieldKey: field.key,
        fieldType: field.type,
        value: normalizedValues[field.id] ?? '',
      })),
    }
    const validation = validateApplicationSubmission(form, submission)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }
    setValues(normalizedValues)
    const readString = (key: string) => {
      const field = form.fields.find((item) => item.key === key)
      const value = field ? normalizedValues[field.id] : undefined
      return typeof value === 'string' ? value.trim() : ''
    }
    const excluded = new Set(['full_name', 'email', 'phone', 'cv', 'github_repository_url'])
    const cvField = form.fields.find((field) => field.key === 'cv')
    setIsSubmitting(true)
    setErrors([])
    try {
      const receipt = await submitApplicationToBackend({
        jobId: form.jobId,
        candidateFullName: readString('full_name'),
        candidateEmail: readString('email'),
        candidatePhone: readString('phone'),
        githubRepositoryUrl: readString('github_repository_url') || undefined,
        cvFile: cvField ? files[cvField.id] : undefined,
        idempotencyKey: crypto.randomUUID(),
        answers: form.fields.filter((field) => !excluded.has(field.key)).map((field) => {
          const answerValue = normalizedValues[field.id]
          return {
            question_key: field.key,
            question_label: field.label,
            answer_text: Array.isArray(answerValue) ? answerValue.join(', ') : String(answerValue ?? ''),
            linked_requirement_codes: field.screeningMapping?.requirementIds ?? [],
          }
        }),
      })
      setBackendReceipt(receipt)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Application submission failed.'])
    } finally {
      setIsSubmitting(false)
    }
  }

  if (invalidBackendJobId) return <PublicUnavailable title="Backend job required" message="Backend mode expects a real PostgreSQL job UUID. Demo job IDs such as job-003 remain demo-only." />
  if (loading) return <PublicUnavailable title="Loading application" message="Loading the backend application form." />
  if (!form) return <PublicUnavailable title="Application unavailable" message={errors[0] ?? 'This backend application form could not be loaded.'} />
  if (backendReceipt) {
    return (
      <main className="min-h-screen bg-frost px-5 py-8">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[620px] place-items-center">
          <SubmissionConfirmation
            heading="Your application has been submitted."
            message={backendReceipt.message}
            referenceLabel="Backend application ID"
            referenceValue={backendReceipt.application_id}
            status={candidateStatus}
          />
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-frost px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-[880px] items-center justify-between py-2 pb-6 text-sm text-aura-text-muted">
        <Link to="/login" className="flex items-center gap-3 font-semibold text-depth no-underline"><img src={logo} alt="AURA Logo" className="size-8 flex-none object-contain" /><span>AURA Technology</span></Link>
        <span>Backend application</span>
      </header>
      <section className="mx-auto max-w-[880px] pb-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">Careers at AURA Technology</p>
        <h1 className="m-0 text-[28px] font-bold leading-tight text-depth md:text-[32px]">Apply for this role</h1>
        <p className="mt-2 mb-0 text-sm text-aura-text-secondary md:text-[15px]">{jobTitle} {department ? `· ${department}` : ''}</p>
      </section>
      <Card className="mx-auto max-w-[880px] rounded-aura-lg p-5 shadow-aura-sm md:p-8">
        {errors.length ? <div className="mb-5 rounded-aura-sm border border-aura-danger/30 bg-aura-danger-soft px-4 py-3 text-sm text-aura-danger" role="alert"><strong>Review your application</strong><ul className="mb-0 mt-2 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
        <form className="grid gap-6" onSubmit={submit} noValidate>
          <div className="grid gap-x-5 gap-y-6 md:grid-cols-2 [&>div:has(textarea)]:md:col-span-2 [&>div:has(input[type='file'])]:md:col-span-2">
            {form.fields.map((field) => <DynamicFormField key={field.id} field={field} value={values[field.id]} onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))} onFileChange={(file) => setFiles((current) => ({ ...current, [field.id]: file }))} />)}
          </div>
          <div className="flex justify-end border-t border-harbor/15 pt-5"><Button disabled={isSubmitting} type="submit">{isSubmitting ? 'Submitting...' : 'Submit application'}</Button></div>
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

function SubmissionConfirmation({
  heading,
  message,
  referenceLabel,
  referenceValue,
  status,
}: {
  heading: string
  message: string
  referenceLabel: string
  referenceValue?: string
  status?: string
}) {
  return (
    <Card className="w-full rounded-aura-lg border border-harbor/15 bg-white px-6 py-8 text-center shadow-aura-sm md:px-8 md:py-10">
      <img src={logo} alt="AURA Logo" className="mx-auto mb-6 h-10 w-auto object-contain" />
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-glacier/20 text-[#7BAD00]">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-marine">Application received</p>
        <h1 className="m-0 text-[26px] font-bold leading-tight text-depth md:text-[30px]">{heading}</h1>
        <p className="mx-auto mb-0 mt-3 max-w-[460px] text-sm leading-6 text-aura-text-secondary">{message}</p>
        {status ? <p className="mx-auto mb-0 mt-4 max-w-[460px] rounded-full bg-[#E9F6F8] px-4 py-2 text-sm font-semibold text-harbor">{status}</p> : null}
      </div>
      <div className="mt-7 border-t border-harbor/10 pt-6">
        <dl className="grid gap-3 text-center">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-aura-text-muted">{referenceLabel}</dt>
            <dd className="m-0 mt-2 break-all rounded-aura-sm border border-harbor/10 bg-frost/70 px-4 py-3 font-utility text-xs font-bold text-harbor">{referenceValue ?? 'Pending'}</dd>
          </div>
        </dl>
      </div>
      <p className="mb-0 mt-5 text-xs leading-5 text-aura-text-muted">Keep this reference for your application status.</p>
    </Card>
  )
}

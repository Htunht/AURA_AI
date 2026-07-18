import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import interviewersData from '../../data/interviewers.json'
import { useDemoStore } from '../../hooks/useDemoStore'
import type { Interviewer } from '../../types/interviewer'
import type { InterviewSchedulingPolicy, InterviewSchedulingPolicyScope, InterviewSchedulingWorkingDay } from '../../types/interviewSchedulingPolicy'
import { validateInterviewSchedulingPolicy } from '../../utils/interviewSchedulingPolicyValidation'
import { createNextSchedulingPolicyId, isSameSchedulingPolicyTarget } from '../../utils/interviewSchedulingPolicyResolution'
import { selectResolvedInterviewSchedulingPolicy } from '../../store/demoSelectors'

const interviewers = interviewersData as Interviewer[]
const days: InterviewSchedulingWorkingDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const fieldClass = 'h-10 w-full rounded-aura-sm border border-harbor/20 bg-white px-3 text-sm text-depth focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35'
const selectClass = `${fieldClass} aura-select-inset`
const backClass = 'inline-flex h-10 items-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline focus-visible:ring-2 focus-visible:ring-glacier'
const primaryButtonLinkClass = 'button inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-[#C7FF38] bg-[#C7FF38] px-4 text-sm font-semibold leading-none text-[#1E2022] no-underline shadow-[0_0_10px_rgba(199,255,56,0.45)] transition-all duration-150 hover:bg-[#a6db2c] hover:shadow-[0_0_14px_rgba(199,255,56,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7FF38] focus-visible:ring-offset-2'

function defaultPolicy(target: { scope: InterviewSchedulingPolicyScope; department?: string; jobId?: string; displayName: string }, version: number, timestamp: string, policies: InterviewSchedulingPolicy[]): InterviewSchedulingPolicy {
  return { id: createNextSchedulingPolicyId(policies, target), scope: target.scope, displayName: target.displayName, department: target.department, jobId: target.jobId, version, status: 'DRAFT', interviewMode: 'VIDEO', durationMinutes: target.scope === 'ORGANIZATION' ? 45 : 60, bufferMinutes: 15, candidateTimezoneStrategy: 'WORKSPACE_TIMEZONE', workspaceTimezone: 'Asia/Yangon', schedulingWindowStartDays: 1, schedulingWindowEndDays: 14, minimumNoticeHours: 24, workingDays: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'], dailyStartTime: '09:00', dailyEndTime: '17:00', interviewerSelectionStrategy: 'LEAST_BOOKED', requiredInterviewerRoles: [], fixedInterviewerIds: [], interviewerCount: 2, candidateSlotCount: 5, slotIntervalMinutes: 30, meetingLinkTemplate: 'https://meet.aura.local/{interviewId}', candidateRescheduleLimit: 2, invitationExpiryHours: 72, createdAt: timestamp, updatedAt: timestamp }
}

export default function InterviewSchedulingPolicyEditor({ scope = 'JOB' }: { scope?: InterviewSchedulingPolicyScope }) {
  const { jobId = '', department = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const job = state.jobs.find((item) => item.id === jobId)
  const target = scope === 'ORGANIZATION'
    ? { scope, displayName: 'Standard interview scheduling' }
    : scope === 'DEPARTMENT'
      ? { scope, department, displayName: `${department} interview scheduling` }
      : { scope, jobId, displayName: `Custom policy for ${job?.title ?? 'this job'}` }
  const policies = state.interviewSchedulingPolicies.filter((item) => isSameSchedulingPolicyTarget(item, target)).sort((a,b) => b.version - a.version)
  const active = policies.find((item) => item.status === 'ACTIVE')
  const draft = policies.find((item) => item.status === 'DRAFT')
  const inherited = scope === 'JOB' ? selectResolvedInterviewSchedulingPolicy(state, jobId) : undefined
  const organizationDefault = state.interviewSchedulingPolicies.find((item) => item.scope === 'ORGANIZATION' && item.status === 'ACTIVE')
  useEffect(() => {
    if (scope === 'JOB' && job && !active && !draft) createDraft()
  }, [scope, job?.id, active?.id, draft?.id])

  if (scope === 'JOB' && !job) return <PageContainer eyebrow="Scheduling policy" title="Job not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested job opening could not be resolved.</Card></PageContainer>
  if (scope === 'DEPARTMENT' && !department.trim()) return <PageContainer eyebrow="Scheduling settings" title="Department not found"><Card className="p-8 text-center text-sm text-aura-text-secondary">The requested department could not be resolved.</Card></PageContainer>

  function createDraft() {
    const timestamp = new Date().toISOString()
    const version = Math.max(0, ...policies.map((item) => item.version)) + 1
    const base = active ?? (scope === 'JOB' ? inherited?.policy : scope === 'DEPARTMENT' ? organizationDefault : undefined)
    const policy = base
      ? { ...base, id: createNextSchedulingPolicyId(state.interviewSchedulingPolicies, target), scope, displayName: target.displayName, department: target.department, jobId: target.jobId, version, status: 'DRAFT' as const, workingDays: [...base.workingDays], requiredInterviewerRoles: [...base.requiredInterviewerRoles], fixedInterviewerIds: [...base.fixedInterviewerIds], createdAt: timestamp, updatedAt: timestamp }
      : defaultPolicy(target, version, timestamp, state.interviewSchedulingPolicies)
    dispatch({ type: 'ADD_INTERVIEW_SCHEDULING_POLICY', payload: { policy } })
  }

  const title = scope === 'ORGANIZATION' ? 'Organization default' : scope === 'DEPARTMENT' ? `${department} template` : 'Custom interview scheduling'
  const description = scope === 'ORGANIZATION'
    ? undefined
    : scope === 'DEPARTMENT'
      ? `A complete scheduling template for ${department} jobs. Jobs fall back to the organization default when this template is unavailable.`
      : undefined
  return <PageContainer eyebrow="Scheduling settings" title={title} description={description} actions={<Link className={backClass} to={scope === 'DEPARTMENT' ? '/interviews/settings/departments' : '/interviews/settings'}><ArrowLeft size={16} />Scheduling settings</Link>}>
    {draft ? <PolicyForm key={draft.id} policy={draft} /> : active ? <PolicySnapshot policy={active} onEdit={createDraft} /> : scope === 'JOB' ? <Card className="p-6 text-sm text-aura-text-secondary">Opening custom schedule settings…</Card> : <div className="flex justify-end"><Button onClick={createDraft}>Customize schedule</Button></div>}
  </PageContainer>

  function PolicyForm({ policy }: { policy: InterviewSchedulingPolicy }) {
    const [form, setForm] = useState(policy)
    const [errors, setErrors] = useState<Record<string, string>>({})
    function update<K extends keyof InterviewSchedulingPolicy>(key: K, value: InterviewSchedulingPolicy[K]) { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: '' })) }
    function save(activate = false) {
      const updated = { ...form, updatedAt: new Date().toISOString() }
      const validation = validateInterviewSchedulingPolicy(updated, state)
      setErrors(validation.errors)
      if (!validation.valid) return
      dispatch({ type: 'UPDATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: form.id, changes: updated } })
      if (activate) dispatch({ type: 'ACTIVATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: form.id, updatedAt: updated.updatedAt } })
      else setForm(updated)
    }
    return <div className="grid gap-4">
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Interview format</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><Field label="Mode"><select className={selectClass} value={form.interviewMode} onChange={(e) => update('interviewMode', e.target.value as InterviewSchedulingPolicy['interviewMode'])}><option value="VIDEO">Video interview</option><option value="PHONE">Phone interview</option><option value="ONSITE">On-site interview</option></select></Field><Field label="Duration"><select className={selectClass} value={form.durationMinutes} onChange={(e) => update('durationMinutes', Number(e.target.value) as InterviewSchedulingPolicy['durationMinutes'])}>{[30,45,60,90].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></Field><Field label="Buffer"><select className={selectClass} value={form.bufferMinutes} onChange={(e) => update('bufferMinutes', Number(e.target.value) as InterviewSchedulingPolicy['bufferMinutes'])}>{[0,10,15,30].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></Field></div><div className="mt-4">{form.interviewMode === 'VIDEO' ? <Field label="Meeting link" error={errors.meetingLinkTemplate}><input className={fieldClass} value={form.meetingLinkTemplate ?? ''} onChange={(e) => update('meetingLinkTemplate', e.target.value)} /></Field> : null}{form.interviewMode === 'ONSITE' ? <Field label="Meeting location" error={errors.meetingLocationTemplate}><input className={fieldClass} value={form.meetingLocationTemplate ?? ''} onChange={(e) => update('meetingLocationTemplate', e.target.value)} /></Field> : null}</div></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Availability window</h2><div className="mt-4 grid gap-4 md:grid-cols-4"><NumberField label="Window starts after days" value={form.schedulingWindowStartDays} onChange={(v) => update('schedulingWindowStartDays', v)} error={errors.schedulingWindowStartDays} /><NumberField label="Window ends after days" value={form.schedulingWindowEndDays} onChange={(v) => update('schedulingWindowEndDays', v)} error={errors.schedulingWindowEndDays} /><NumberField label="Minimum notice hours" value={form.minimumNoticeHours} onChange={(v) => update('minimumNoticeHours', v)} error={errors.minimumNoticeHours} /><Field label="Workspace timezone"><select className={selectClass} value={form.workspaceTimezone} onChange={(e) => update('workspaceTimezone', e.target.value)}><option>Asia/Yangon</option><option>Asia/Bangkok</option><option>Asia/Singapore</option><option>UTC</option></select></Field></div><div className="mt-5"><p className="mb-2 text-sm font-semibold text-depth">Working days</p><div className="flex flex-wrap gap-2">{days.map((day) => <label className={`cursor-pointer rounded-aura-sm border px-3 py-2 text-xs font-semibold ${form.workingDays.includes(day) ? 'border-marine bg-glacier/15 text-depth' : 'border-harbor/15 text-aura-text-secondary'}`} key={day}><input className="mr-2 accent-harbor" type="checkbox" checked={form.workingDays.includes(day)} onChange={() => update('workingDays', form.workingDays.includes(day) ? form.workingDays.filter((item) => item !== day) : [...form.workingDays, day])} />{day.slice(0,3)}</label>)}</div>{errors.workingDays ? <p className="mb-0 mt-2 text-xs text-aura-danger">{errors.workingDays}</p> : null}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Daily start"><input className={fieldClass} type="time" value={form.dailyStartTime} onChange={(e) => update('dailyStartTime', e.target.value)} /></Field><Field label="Daily end" error={errors.dailyEndTime}><input className={fieldClass} type="time" value={form.dailyEndTime} onChange={(e) => update('dailyEndTime', e.target.value)} /></Field></div></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Interview team assignment</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Selection strategy"><select className={selectClass} value={form.interviewerSelectionStrategy} onChange={(e) => update('interviewerSelectionStrategy', e.target.value as InterviewSchedulingPolicy['interviewerSelectionStrategy'])}><option value="REQUIRED_ROLES">Required roles</option><option value="FIXED_INTERVIEWERS">Fixed interviewers</option><option value="LEAST_BOOKED">Least booked</option></select></Field><NumberField label="Interviewer count" value={form.interviewerCount} onChange={(v) => update('interviewerCount', v)} error={errors.interviewerCount} /></div>{form.interviewerSelectionStrategy === 'REQUIRED_ROLES' ? <Field label="Required roles" error={errors.requiredInterviewerRoles}><div className="grid gap-2 sm:grid-cols-2">{interviewers.map((person) => <label className="text-sm text-depth" key={person.id}><input className="mr-2 accent-harbor" type="checkbox" checked={form.requiredInterviewerRoles.includes(person.roleTitle)} onChange={() => update('requiredInterviewerRoles', form.requiredInterviewerRoles.includes(person.roleTitle) ? form.requiredInterviewerRoles.filter((role) => role !== person.roleTitle) : [...form.requiredInterviewerRoles, person.roleTitle])} />{person.roleTitle}</label>)}</div></Field> : null}{form.interviewerSelectionStrategy === 'FIXED_INTERVIEWERS' ? <Field label="Fixed interviewers" error={errors.fixedInterviewerIds}><div className="grid gap-2 sm:grid-cols-2">{interviewers.map((person) => <label className="text-sm text-depth" key={person.id}><input className="mr-2 accent-harbor" type="checkbox" checked={form.fixedInterviewerIds.includes(person.id)} onChange={() => update('fixedInterviewerIds', form.fixedInterviewerIds.includes(person.id) ? form.fixedInterviewerIds.filter((id) => id !== person.id) : [...form.fixedInterviewerIds, person.id])} />{person.fullName} · {person.roleTitle}</label>)}</div></Field> : null}</Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Candidate choices and expiry</h2><div className="mt-4 grid gap-4 md:grid-cols-4"><NumberField label="Candidate slot count" value={form.candidateSlotCount} onChange={(v) => update('candidateSlotCount', v)} error={errors.candidateSlotCount} /><Field label="Slot interval"><select className={selectClass} value={form.slotIntervalMinutes} onChange={(e) => update('slotIntervalMinutes', Number(e.target.value) as InterviewSchedulingPolicy['slotIntervalMinutes'])}>{[15,30,60].map((v) => <option key={v} value={v}>{v} minutes</option>)}</select></Field><NumberField label="Reschedule limit" value={form.candidateRescheduleLimit} onChange={(v) => update('candidateRescheduleLimit', v)} error={errors.candidateRescheduleLimit} /><NumberField label="Invitation expiry hours" value={form.invitationExpiryHours} onChange={(v) => update('invitationExpiryHours', v)} error={errors.invitationExpiryHours} /></div></Card>
      {Object.keys(errors).length ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft p-4 text-sm text-aura-danger" role="alert">Review the highlighted policy fields before saving.</p> : null}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={() => save(true)}>Activate policy</Button></div>
    </div>
  }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-semibold text-depth">{label}{children}{error ? <span className="text-xs font-normal text-aura-danger">{error}</span> : null}</label> }
function NumberField({ label, value, onChange, error }: { label: string; value: number; onChange: (value: number) => void; error?: string }) { return <Field label={label} error={error}><input className={fieldClass} type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} /></Field> }
function formatPolicyValue(value: string) {
  return value.replaceAll('_', ' ').toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase())
}

function formatWorkingDays(days: InterviewSchedulingWorkingDay[]) {
  return days.map((day) => day.slice(0, 3).toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase())).join(', ')
}

function formatInterviewers(policy: InterviewSchedulingPolicy) {
  if (policy.interviewerSelectionStrategy === 'REQUIRED_ROLES') return policy.requiredInterviewerRoles.join(', ') || 'No required roles'
  if (policy.interviewerSelectionStrategy === 'FIXED_INTERVIEWERS') {
    const names = policy.fixedInterviewerIds.map((id) => interviewers.find((person) => person.id === id)?.fullName ?? id)
    return names.join(', ') || 'No fixed interviewers'
  }
  return `${policy.interviewerCount} least-booked interviewer${policy.interviewerCount === 1 ? '' : 's'}`
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-aura-text-muted">{label}</dt><dd className="mb-0 mt-1 break-words text-sm font-semibold leading-6 text-depth">{value}</dd></div>
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-harbor/10 pt-5 first:border-t-0 first:pt-0"><h2 className="m-0 text-base font-bold text-depth">{title}</h2>{children}</section>
}

function PolicySnapshot({ policy, onEdit }: { policy: InterviewSchedulingPolicy; onEdit: () => void }) {
  return <Card className="p-5 md:p-6">
    <div className="flex flex-col gap-2 border-b border-harbor/10 pb-5 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="m-0 text-xl font-bold text-depth">Custom schedule details</h2>
        <p className="mb-0 mt-1 text-sm text-aura-text-secondary">Saved interview scheduling information for this job.</p>
      </div>
      <p className="m-0 text-xs font-semibold text-aura-text-muted">Updated {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(policy.updatedAt))}</p>
    </div>
    <div className="mt-5 grid gap-6">
      <InfoSection title="Interview format">
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <Detail label="Mode" value={formatPolicyValue(policy.interviewMode)} />
          <Detail label="Duration" value={`${policy.durationMinutes} minutes`} />
          <Detail label="Buffer" value={`${policy.bufferMinutes} minutes`} />
          {policy.meetingLinkTemplate ? <Detail label="Meeting link" value={policy.meetingLinkTemplate} /> : null}
          {policy.meetingLocationTemplate ? <Detail label="Meeting location" value={policy.meetingLocationTemplate} /> : null}
        </dl>
      </InfoSection>
      <InfoSection title="Availability window">
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          <Detail label="Window starts" value={`${policy.schedulingWindowStartDays} days`} />
          <Detail label="Window ends" value={`${policy.schedulingWindowEndDays} days`} />
          <Detail label="Minimum notice" value={`${policy.minimumNoticeHours} hours`} />
          <Detail label="Timezone" value={policy.workspaceTimezone} />
          <Detail label="Working days" value={formatWorkingDays(policy.workingDays)} />
          <Detail label="Daily start" value={policy.dailyStartTime} />
          <Detail label="Daily end" value={policy.dailyEndTime} />
        </dl>
      </InfoSection>
      <InfoSection title="Interview team assignment">
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <Detail label="Selection strategy" value={formatPolicyValue(policy.interviewerSelectionStrategy)} />
          <Detail label="Interviewer count" value={policy.interviewerCount} />
          <Detail label="Assigned team" value={formatInterviewers(policy)} />
        </dl>
      </InfoSection>
      <InfoSection title="Candidate choices and expiry">
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <Detail label="Candidate slots" value={policy.candidateSlotCount} />
          <Detail label="Slot interval" value={`${policy.slotIntervalMinutes} minutes`} />
          <Detail label="Reschedule limit" value={policy.candidateRescheduleLimit} />
          <Detail label="Invitation expiry" value={`${policy.invitationExpiryHours} hours`} />
        </dl>
      </InfoSection>
    </div>
    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-harbor/10 pt-5 sm:flex-row sm:justify-end">
      <Button variant="secondary" onClick={onEdit}>Edit</Button>
      {policy.jobId ? <Link className={primaryButtonLinkClass} to={`/jobs/${policy.jobId}`}>Confirm</Link> : null}
    </div>
  </Card>
}

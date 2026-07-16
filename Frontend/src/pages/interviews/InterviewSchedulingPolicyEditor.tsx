import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
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
const backClass = 'inline-flex h-10 items-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline focus-visible:ring-2 focus-visible:ring-glacier'

function defaultPolicy(target: { scope: InterviewSchedulingPolicyScope; department?: string; jobId?: string; displayName: string }, version: number, timestamp: string, policies: InterviewSchedulingPolicy[]): InterviewSchedulingPolicy {
  return { id: createNextSchedulingPolicyId(policies, target), scope: target.scope, displayName: target.displayName, department: target.department, jobId: target.jobId, version, status: 'DRAFT', interviewMode: 'VIDEO', durationMinutes: target.scope === 'ORGANIZATION' ? 45 : 60, bufferMinutes: 15, candidateTimezoneStrategy: 'WORKSPACE_TIMEZONE', workspaceTimezone: 'Asia/Yangon', schedulingWindowStartDays: 1, schedulingWindowEndDays: 14, minimumNoticeHours: 24, workingDays: ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'], dailyStartTime: '09:00', dailyEndTime: '17:00', interviewerSelectionStrategy: 'LEAST_BOOKED', requiredInterviewerRoles: [], fixedInterviewerIds: [], interviewerCount: 2, candidateSlotCount: 5, slotIntervalMinutes: 30, meetingLinkTemplate: 'https://meet.aura.local/{interviewId}', candidateRescheduleLimit: 2, invitationExpiryHours: 72, createdAt: timestamp, updatedAt: timestamp }
}

export default function InterviewSchedulingPolicyEditor({ scope = 'JOB' }: { scope?: InterviewSchedulingPolicyScope }) {
  const { jobId = '', department = '' } = useParams()
  const { state, dispatch } = useDemoStore()
  const [archiveWarning, setArchiveWarning] = useState(false)
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

  function archiveActive() {
    if (!active) return
    dispatch({ type: 'ARCHIVE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: active.id, updatedAt: new Date().toISOString() } })
    setArchiveWarning(false)
  }

  const title = scope === 'ORGANIZATION' ? 'Organization default' : scope === 'DEPARTMENT' ? `${department} template` : 'Custom interview scheduling'
  const description = scope === 'ORGANIZATION'
    ? 'Used when a job has no department template or custom override.'
    : scope === 'DEPARTMENT'
      ? `A complete scheduling template for ${department} jobs. Jobs fall back to the organization default when this template is unavailable.`
      : `This job currently ${inherited?.source === 'JOB_OVERRIDE' ? 'uses a custom policy' : `inherits ${inherited?.sourceLabel ?? 'no scheduling defaults'}`}. Create an override only when ${job?.title} needs different rules.`
  return <PageContainer eyebrow="Scheduling settings" title={title} description={description} actions={<Link className={backClass} to={scope === 'DEPARTMENT' ? '/interviews/settings/departments' : '/interviews/settings'}><ArrowLeft size={16} />Scheduling settings</Link>}>
    {draft ? <PolicyForm key={draft.id} policy={draft} /> : <><Card className="mb-4 p-5 md:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="m-0 text-lg font-semibold text-depth">{active ? `Active policy · Version ${active.version}` : 'No active policy'}</h2>{active ? <Badge tone="success">Active</Badge> : null}</div><p className="mb-0 mt-2 text-sm text-aura-text-secondary">{active ? 'Active policies are read-only. Create a draft version to make changes.' : 'Create and activate a complete scheduling setup before it can be inherited.'}</p></div><div className="flex flex-wrap gap-2">{active ? <Button variant="secondary" onClick={() => setArchiveWarning(true)}>Archive</Button> : null}<Button onClick={createDraft}>{active ? 'Create new version' : 'Create initial draft'}</Button></div></div>{archiveWarning ? <div className="mt-4 rounded-aura-sm border border-aura-warning/25 bg-aura-warning-soft p-4" role="alert"><p className="m-0 text-sm font-semibold text-depth">Archive this active version?</p><p className="mb-0 mt-1 text-xs leading-5 text-aura-text-secondary">{scope === 'ORGANIZATION' ? 'Jobs without department templates or custom overrides will require scheduling setup.' : 'Jobs using this template will fall back to the next available scheduling default.'}</p><div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => setArchiveWarning(false)}>Keep active</Button><Button variant="secondary" onClick={archiveActive}>Archive version</Button></div></div> : null}</Card>{active ? <PolicySnapshot policy={active} /> : null}</>}
  </PageContainer>

  function PolicyForm({ policy }: { policy: InterviewSchedulingPolicy }) {
    const [form, setForm] = useState(policy)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saved, setSaved] = useState(false)
    function update<K extends keyof InterviewSchedulingPolicy>(key: K, value: InterviewSchedulingPolicy[K]) { setForm((current) => ({ ...current, [key]: value })); setSaved(false); setErrors((current) => ({ ...current, [key]: '' })) }
    function save(activate = false) {
      const updated = { ...form, updatedAt: new Date().toISOString() }
      const validation = validateInterviewSchedulingPolicy(updated, state)
      setErrors(validation.errors)
      if (!validation.valid) return
      dispatch({ type: 'UPDATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: form.id, changes: updated } })
      if (activate) dispatch({ type: 'ACTIVATE_INTERVIEW_SCHEDULING_POLICY', payload: { policyId: form.id, updatedAt: updated.updatedAt } })
      else { setForm(updated); setSaved(true) }
    }
    return <div className="grid gap-4"><Card className="border-marine/20 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex gap-2"><h2 className="m-0 text-lg font-semibold text-depth">Draft version {form.version}</h2><Badge tone="accent">Draft</Badge></div><p className="mb-0 mt-1 text-xs text-aura-text-muted">Changes do not affect automation until this version is activated.</p></div>{saved ? <span className="flex items-center gap-2 text-sm font-semibold text-aura-success"><CheckCircle2 size={16} />Saved</span> : null}</div></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Interview format</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><Field label="Mode"><select className={fieldClass} value={form.interviewMode} onChange={(e) => update('interviewMode', e.target.value as InterviewSchedulingPolicy['interviewMode'])}><option value="VIDEO">Video interview</option><option value="PHONE">Phone interview</option><option value="ONSITE">On-site interview</option></select></Field><Field label="Duration"><select className={fieldClass} value={form.durationMinutes} onChange={(e) => update('durationMinutes', Number(e.target.value) as InterviewSchedulingPolicy['durationMinutes'])}>{[30,45,60,90].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></Field><Field label="Buffer"><select className={fieldClass} value={form.bufferMinutes} onChange={(e) => update('bufferMinutes', Number(e.target.value) as InterviewSchedulingPolicy['bufferMinutes'])}>{[0,10,15,30].map((value) => <option key={value} value={value}>{value} minutes</option>)}</select></Field></div><div className="mt-4">{form.interviewMode === 'VIDEO' ? <Field label="Meeting link template" error={errors.meetingLinkTemplate}><input className={fieldClass} value={form.meetingLinkTemplate ?? ''} onChange={(e) => update('meetingLinkTemplate', e.target.value)} /></Field> : null}{form.interviewMode === 'ONSITE' ? <Field label="Meeting location" error={errors.meetingLocationTemplate}><input className={fieldClass} value={form.meetingLocationTemplate ?? ''} onChange={(e) => update('meetingLocationTemplate', e.target.value)} /></Field> : null}</div></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Availability window</h2><div className="mt-4 grid gap-4 md:grid-cols-4"><NumberField label="Window starts after days" value={form.schedulingWindowStartDays} onChange={(v) => update('schedulingWindowStartDays', v)} error={errors.schedulingWindowStartDays} /><NumberField label="Window ends after days" value={form.schedulingWindowEndDays} onChange={(v) => update('schedulingWindowEndDays', v)} error={errors.schedulingWindowEndDays} /><NumberField label="Minimum notice hours" value={form.minimumNoticeHours} onChange={(v) => update('minimumNoticeHours', v)} error={errors.minimumNoticeHours} /><Field label="Workspace timezone"><select className={fieldClass} value={form.workspaceTimezone} onChange={(e) => update('workspaceTimezone', e.target.value)}><option>Asia/Yangon</option><option>Asia/Bangkok</option><option>Asia/Singapore</option><option>UTC</option></select></Field></div><div className="mt-5"><p className="mb-2 text-sm font-semibold text-depth">Working days</p><div className="flex flex-wrap gap-2">{days.map((day) => <label className={`cursor-pointer rounded-aura-sm border px-3 py-2 text-xs font-semibold ${form.workingDays.includes(day) ? 'border-marine bg-glacier/15 text-depth' : 'border-harbor/15 text-aura-text-secondary'}`} key={day}><input className="mr-2 accent-harbor" type="checkbox" checked={form.workingDays.includes(day)} onChange={() => update('workingDays', form.workingDays.includes(day) ? form.workingDays.filter((item) => item !== day) : [...form.workingDays, day])} />{day.slice(0,3)}</label>)}</div>{errors.workingDays ? <p className="mb-0 mt-2 text-xs text-aura-danger">{errors.workingDays}</p> : null}</div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Daily start"><input className={fieldClass} type="time" value={form.dailyStartTime} onChange={(e) => update('dailyStartTime', e.target.value)} /></Field><Field label="Daily end" error={errors.dailyEndTime}><input className={fieldClass} type="time" value={form.dailyEndTime} onChange={(e) => update('dailyEndTime', e.target.value)} /></Field></div></Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Interview team assignment</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Selection strategy"><select className={fieldClass} value={form.interviewerSelectionStrategy} onChange={(e) => update('interviewerSelectionStrategy', e.target.value as InterviewSchedulingPolicy['interviewerSelectionStrategy'])}><option value="REQUIRED_ROLES">Required roles</option><option value="FIXED_INTERVIEWERS">Fixed interviewers</option><option value="LEAST_BOOKED">Least booked</option></select></Field><NumberField label="Interviewer count" value={form.interviewerCount} onChange={(v) => update('interviewerCount', v)} error={errors.interviewerCount} /></div>{form.interviewerSelectionStrategy === 'REQUIRED_ROLES' ? <Field label="Required roles" error={errors.requiredInterviewerRoles}><div className="grid gap-2 sm:grid-cols-2">{interviewers.map((person) => <label className="text-sm text-depth" key={person.id}><input className="mr-2 accent-harbor" type="checkbox" checked={form.requiredInterviewerRoles.includes(person.roleTitle)} onChange={() => update('requiredInterviewerRoles', form.requiredInterviewerRoles.includes(person.roleTitle) ? form.requiredInterviewerRoles.filter((role) => role !== person.roleTitle) : [...form.requiredInterviewerRoles, person.roleTitle])} />{person.roleTitle}</label>)}</div></Field> : null}{form.interviewerSelectionStrategy === 'FIXED_INTERVIEWERS' ? <Field label="Fixed interviewers" error={errors.fixedInterviewerIds}><div className="grid gap-2 sm:grid-cols-2">{interviewers.map((person) => <label className="text-sm text-depth" key={person.id}><input className="mr-2 accent-harbor" type="checkbox" checked={form.fixedInterviewerIds.includes(person.id)} onChange={() => update('fixedInterviewerIds', form.fixedInterviewerIds.includes(person.id) ? form.fixedInterviewerIds.filter((id) => id !== person.id) : [...form.fixedInterviewerIds, person.id])} />{person.fullName} · {person.roleTitle}</label>)}</div></Field> : null}</Card>
      <Card className="p-5 md:p-6"><h2 className="m-0 text-lg font-semibold text-depth">Candidate choices and expiry</h2><div className="mt-4 grid gap-4 md:grid-cols-4"><NumberField label="Candidate slot count" value={form.candidateSlotCount} onChange={(v) => update('candidateSlotCount', v)} error={errors.candidateSlotCount} /><Field label="Slot interval"><select className={fieldClass} value={form.slotIntervalMinutes} onChange={(e) => update('slotIntervalMinutes', Number(e.target.value) as InterviewSchedulingPolicy['slotIntervalMinutes'])}>{[15,30,60].map((v) => <option key={v} value={v}>{v} minutes</option>)}</select></Field><NumberField label="Reschedule limit" value={form.candidateRescheduleLimit} onChange={(v) => update('candidateRescheduleLimit', v)} error={errors.candidateRescheduleLimit} /><NumberField label="Invitation expiry hours" value={form.invitationExpiryHours} onChange={(v) => update('invitationExpiryHours', v)} error={errors.invitationExpiryHours} /></div></Card>
      {Object.keys(errors).length ? <p className="m-0 rounded-aura-sm bg-aura-danger-soft p-4 text-sm text-aura-danger" role="alert">Review the highlighted policy fields before saving.</p> : null}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => save(false)}>Save draft</Button><Button onClick={() => save(true)}>Activate policy</Button></div>
    </div>
  }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-semibold text-depth">{label}{children}{error ? <span className="text-xs font-normal text-aura-danger">{error}</span> : null}</label> }
function NumberField({ label, value, onChange, error }: { label: string; value: number; onChange: (value: number) => void; error?: string }) { return <Field label={label} error={error}><input className={fieldClass} type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} /></Field> }
function PolicySnapshot({ policy }: { policy: InterviewSchedulingPolicy }) { return <Card className="p-5"><dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-xs text-aura-text-muted">Working hours</dt><dd className="mb-0 mt-1 font-semibold text-depth">{policy.dailyStartTime}–{policy.dailyEndTime}</dd></div><div><dt className="text-xs text-aura-text-muted">Scheduling window</dt><dd className="mb-0 mt-1 font-semibold text-depth">{policy.schedulingWindowStartDays}–{policy.schedulingWindowEndDays} days</dd></div><div><dt className="text-xs text-aura-text-muted">Assignment</dt><dd className="mb-0 mt-1 font-semibold text-depth">{policy.interviewerSelectionStrategy.replaceAll('_', ' ').toLowerCase()}</dd></div></dl></Card> }

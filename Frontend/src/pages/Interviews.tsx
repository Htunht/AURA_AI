import { AlertTriangle, Clipboard, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { InterviewCard } from '../components/interviews/InterviewCard'
import { InterviewTable } from '../components/interviews/InterviewTable'
import { PageContainer } from '../components/layout/PageContainer'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useDemoStore } from '../hooks/useDemoStore'
import { selectInterviewListItems, selectPendingSchedulingInvitations, selectSchedulingExceptions } from '../store/demoSelectors'
import { formatDateTime } from '../utils/helpers'

const actionClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-harbor bg-harbor px-4 text-sm font-semibold text-white no-underline hover:bg-depth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier'
const secondaryClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border border-marine/30 bg-white px-4 text-sm font-semibold text-harbor no-underline focus-visible:ring-2 focus-visible:ring-glacier'

export default function Interviews() {
  const { state } = useDemoStore()
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({})
  const items = selectInterviewListItems(state)
  const pending = selectPendingSchedulingInvitations(state)
  const exceptions = selectSchedulingExceptions(state)
  const current = items.filter((item) => item.interview.status === 'SCHEDULED' || item.interview.status === 'IN_PROGRESS')
  const history = items.filter((item) => item.interview.status === 'COMPLETED' || item.interview.status === 'CANCELLED')

  async function copyLink(token: string) {
    const path = `/schedule/${token}`
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(`${window.location.origin}${path}`)
      setCopyStatus((currentStatus) => ({ ...currentStatus, [token]: 'Scheduling link copied.' }))
    } catch {
      setCopyStatus((currentStatus) => ({ ...currentStatus, [token]: `Copy this path: ${path}` }))
    }
  }

  return <PageContainer eyebrow="Interview operations" title="Interviews" description="Monitor candidate self-scheduling, upcoming interviews, and automation exceptions." actions={<div className="flex flex-wrap gap-2"><Link className={secondaryClass} to="/interviews/exceptions"><AlertTriangle size={16} />View exceptions</Link><Link className={actionClass} to="/interviews/policies"><Settings2 size={16} />Manage policies</Link></div>}>
    <section className="mb-7"><div className="mb-3 flex items-end justify-between"><div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-marine">Candidate action</p><h2 className="mb-0 mt-1 text-lg font-semibold text-depth">Awaiting candidate selection</h2></div><Badge tone="accent">{pending.length}</Badge></div>{pending.length ? <div className="grid gap-3 lg:grid-cols-2">{pending.map((invitation) => {
      const application = state.applications.find((item) => item.id === invitation.applicationId)
      const candidate = application ? state.candidates.find((item) => item.id === application.candidateId) : undefined
      const job = state.jobs.find((item) => item.id === invitation.jobId)
      if (!candidate || !job) return null
      const path = `/schedule/${invitation.token}`
      return <Card className="p-5" key={invitation.id}><div className="flex items-start justify-between gap-3"><div><h3 className="m-0 text-base font-semibold text-depth">{candidate.fullName}</h3><p className="mb-0 mt-1 text-sm text-aura-text-secondary">{job.title}</p></div><Badge tone="accent">Invitation ready</Badge></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-aura-text-muted">Available times</dt><dd className="mb-0 mt-1 font-semibold text-depth">{invitation.availableSlots.length} slots</dd></div><div><dt className="text-xs text-aura-text-muted">Expires</dt><dd className="mb-0 mt-1 font-semibold text-depth">{formatDateTime(invitation.expiresAt)}</dd></div></dl><code className="mt-4 block overflow-x-auto rounded-aura-sm bg-frost px-3 py-2 text-xs text-aura-text-secondary">{path}</code><Button className="mt-3" variant="secondary" onClick={() => copyLink(invitation.token)} aria-label={`Copy scheduling link for ${candidate.fullName}`}><Clipboard size={15} />Copy scheduling link</Button>{copyStatus[invitation.token] ? <p className="mb-0 mt-2 text-xs text-aura-text-muted" role="status">{copyStatus[invitation.token]}</p> : null}</Card>
    })}</div> : <Card className="p-6 text-center text-sm text-aura-text-secondary">No candidates are currently waiting to select an interview time.</Card>}</section>
    {exceptions.length ? <section className="mb-7"><div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-lg font-semibold text-depth">Scheduling exceptions</h2><Badge tone="warning">{exceptions.length}</Badge></div><Card className="flex flex-col gap-4 border-aura-warning/20 p-5 sm:flex-row sm:items-center sm:justify-between"><p className="m-0 text-sm text-aura-text-secondary">{exceptions.length} candidate{exceptions.length === 1 ? '' : 's'} need policy or availability attention.</p><Link className={secondaryClass} to="/interviews/exceptions">Resolve scheduling</Link></Card></section> : null}
    <section className="mb-7"><div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-lg font-semibold text-depth">Upcoming interviews</h2><Badge>{current.length}</Badge></div>{current.length ? <><div className="hidden xl:block"><InterviewTable items={current} /></div><div className="grid gap-3 xl:hidden">{current.map((item) => <InterviewCard item={item} key={item.interview.id} />)}</div></> : <Card className="p-6 text-center text-sm text-aura-text-secondary">Confirmed candidate interview times will appear here.</Card>}</section>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="m-0 text-lg font-semibold text-depth">Completed and cancelled</h2><Badge tone="neutral">{history.length}</Badge></div>{history.length ? <><div className="hidden xl:block"><InterviewTable items={history} /></div><div className="grid gap-3 xl:hidden">{history.map((item) => <InterviewCard item={item} key={item.interview.id} />)}</div></> : <Card className="p-6 text-center text-sm text-aura-text-secondary">No completed or cancelled interviews.</Card>}</section>
  </PageContainer>
}

import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  RotateCcw,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { backendWorkspaceMode } from '../../config/workspaceMode'
import { useDemoStore } from '../../hooks/useDemoStore'
import { ApiError } from '../../services/api'
import { getInterviewCalendar } from '../../services/backendRecruiterApi'
import type { CalendarInterview, InterviewCalendarFilters } from '../../types/interviewCalendar'
import {
  CANCELLED_INTERVIEW_STATUSES,
  filterCalendarInterviews,
  formatCalendarDate,
  formatCalendarTime,
  getZonedDateKey,
  groupCalendarInterviews,
  isValidMeetingUrl,
  mapBackendInterviewCalendar,
  mapDemoInterviewCalendar,
  summarizeCalendar,
} from '../../utils/interviewCalendar'

const DEFAULT_TIMEZONE = 'Asia/Yangon'
const EMPTY_FILTERS: InterviewCalendarFilters = { jobId: '', status: '', interviewerId: '', interviewType: '' }
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function InterviewCalendar() {
  const { state } = useDemoStore()
  const [currentMonth, setCurrentMonth] = useState(() => monthStart(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [filters, setFilters] = useState<InterviewCalendarFilters>(EMPTY_FILTERS)
  const [backendItems, setBackendItems] = useState<CalendarInterview[]>([])
  const [displayTimezone, setDisplayTimezone] = useState(DEFAULT_TIMEZONE)
  const [loading, setLoading] = useState(backendWorkspaceMode)
  const [error, setError] = useState<unknown>()
  const monthRange = useMemo(() => getMonthRange(currentMonth), [currentMonth])

  const loadBackendCalendar = useCallback(async () => {
    if (!backendWorkspaceMode) return
    setLoading(true)
    setError(undefined)
    try {
      const response = await getInterviewCalendar(monthRange)
      setBackendItems(mapBackendInterviewCalendar(response))
      setDisplayTimezone(response.range.timezone)
    } catch (loadError) {
      setBackendItems([])
      setError(loadError)
    } finally {
      setLoading(false)
    }
  }, [monthRange])

  useEffect(() => {
    void loadBackendCalendar()
  }, [loadBackendCalendar])

  const allItems = useMemo(
    () => backendWorkspaceMode ? backendItems : mapDemoInterviewCalendar(state),
    [backendItems, state],
  )
  const monthItems = useMemo(() => allItems.filter((item) => {
    const key = getZonedDateKey(item.scheduledStart, displayTimezone)
    return key >= monthRange.start && key < monthRange.end
  }), [allItems, displayTimezone, monthRange])
  const filteredItems = useMemo(() => filterCalendarInterviews(monthItems, filters), [filters, monthItems])
  const groupedItems = useMemo(() => groupCalendarInterviews(filteredItems, displayTimezone), [displayTimezone, filteredItems])
  const summary = useMemo(() => summarizeCalendar(filteredItems, displayTimezone), [displayTimezone, filteredItems])
  const selectedItems = groupedItems.get(selectedDate) ?? []
  const filterOptions = useMemo(() => buildFilterOptions(monthItems), [monthItems])
  const cells = useMemo(() => buildMonthCells(currentMonth), [currentMonth])
  const hasFilters = Object.values(filters).some(Boolean)

  function moveMonth(offset: number) {
    const next = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + offset, 1))
    setCurrentMonth(next)
    setSelectedDate(dateKey(next))
  }

  function goToday() {
    const today = new Date()
    setCurrentMonth(monthStart(today))
    setSelectedDate(dateKey(today))
  }

  const pageError = getCalendarError(error)

  return (
    <PageContainer
      eyebrow="Recruitment schedule"
      title="Interview Calendar"
      description={`Interview times are grouped in ${displayTimezone}. Cancelled interviews remain visible but are excluded from active totals.`}
    >
      <section aria-label="Calendar summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Interviews this month" value={summary.totalInterviews} />
        <SummaryCard label="Interviews today" value={summary.todayInterviews} />
        <SummaryCard label="Busiest day" value={summary.busiestDateTotal} detail={summary.busiestDate ? formatShortDate(summary.busiestDate) : 'No scheduled day'} />
        <SummaryCard label="Pending confirmation" value={summary.pendingConfirmation} />
      </section>

      <Card className="mt-4 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-harbor/10 px-4 py-4 md:px-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Previous month" className="size-10 px-0" variant="secondary" onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></Button>
            <Button aria-label="Next month" className="size-10 px-0" variant="secondary" onClick={() => moveMonth(1)}><ChevronRight size={17} /></Button>
            <Button variant="ghost" onClick={goToday}>Today</Button>
            <h2 className="m-0 ml-1 text-lg font-semibold text-depth md:text-xl" aria-live="polite">{formatMonth(currentMonth)}</h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" aria-label="Calendar filters">
            <FilterSelect label="Job" value={filters.jobId} options={filterOptions.jobs} onChange={(jobId) => setFilters((current) => ({ ...current, jobId }))} />
            <FilterSelect label="Status" value={filters.status} options={filterOptions.statuses} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
            <FilterSelect label="Interviewer" value={filters.interviewerId} options={filterOptions.interviewers} onChange={(interviewerId) => setFilters((current) => ({ ...current, interviewerId }))} />
            <FilterSelect label="Interview type" value={filters.interviewType} options={filterOptions.types} onChange={(interviewType) => setFilters((current) => ({ ...current, interviewType }))} />
            <Button className="self-end" disabled={!hasFilters} variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}><RotateCcw size={14} />Clear filters</Button>
          </div>
        </div>

        {loading ? <CalendarLoading /> : pageError ? (
          <CalendarErrorState title={pageError.title} message={pageError.message} retry={pageError.retry ? loadBackendCalendar : undefined} />
        ) : (
          <div className="grid items-start xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="overflow-x-auto border-b border-harbor/10 xl:border-b-0 xl:border-r">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 border-b border-harbor/10 bg-frost/60">
                  {weekdayLabels.map((day) => <div className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-aura-text-muted" key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 bg-harbor/10 gap-px">
                  {cells.map((cell) => {
                    const dayItems = groupedItems.get(cell.key) ?? []
                    const activeCount = dayItems.filter((item) => !CANCELLED_INTERVIEW_STATUSES.has(item.status)).length
                    const selected = selectedDate === cell.key
                    const today = cell.key === dateKey(new Date())
                    return (
                      <button
                        type="button"
                        className={`min-h-32 bg-white p-2.5 text-left align-top transition-colors focus-visible:relative focus-visible:z-10 md:min-h-36 ${cell.inMonth ? 'hover:bg-glacier/[0.08]' : 'bg-frost/70 text-aura-text-muted'} ${selected ? 'inset-ring-2 inset-ring-marine bg-glacier/[0.10]' : ''}`}
                        aria-label={`${formatCalendarDate(cell.key)}, ${activeCount} scheduled ${activeCount === 1 ? 'interview' : 'interviews'}`}
                        aria-pressed={selected}
                        key={cell.key}
                        onClick={() => setSelectedDate(cell.key)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-grid size-7 place-items-center rounded-full text-xs font-bold ${today ? 'bg-depth text-[#C7FF38]' : 'text-depth'}`}>{cell.day}</span>
                          {activeCount > 0 ? <span className="text-[10px] font-semibold text-harbor">{activeCount} {activeCount === 1 ? 'interview' : 'interviews'}</span> : null}
                        </div>
                        <div className="mt-2 space-y-1">
                          {dayItems.slice(0, 3).map((item) => (
                            <div className={`truncate border-l-2 px-1.5 text-[10px] leading-5 ${item.status === 'CANCELLED' ? 'border-harbor/20 text-aura-text-muted line-through' : 'border-marine text-depth'}`} key={item.id}>
                              {formatCalendarTime(item.scheduledStart, item.timezone)} {item.candidateName}
                            </div>
                          ))}
                          {dayItems.length > 3 ? <p className="m-0 px-1.5 text-[10px] font-semibold text-harbor">+{dayItems.length - 3} more</p> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <SelectedDayPanel date={selectedDate} items={selectedItems} filtered={hasFilters} />
          </div>
        )}
      </Card>

      {!loading && !pageError && monthItems.length === 0 ? <EmptyNotice message="No interviews this month." /> : null}
      {!loading && !pageError && monthItems.length > 0 && filteredItems.length === 0 ? <EmptyNotice message="No interviews match the selected filters." /> : null}
    </PageContainer>
  )
}

function SelectedDayPanel({ date, items, filtered }: { date: string; items: CalendarInterview[]; filtered: boolean }) {
  return (
    <aside className="min-w-0 bg-frost/35" aria-live="polite" aria-label={`Interviews for ${formatCalendarDate(date)}`}>
      <header className="border-b border-harbor/10 bg-depth px-5 py-4 text-white">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-glacier">Selected day</p>
        <h2 className="m-0 text-base font-semibold text-white">{formatCalendarDate(date)}</h2>
        <p className="mb-0 mt-1 text-xs text-white/55">{items.length} record{items.length === 1 ? '' : 's'} shown</p>
      </header>
      <div className="max-h-[650px] space-y-3 overflow-y-auto p-4">
        {items.length ? items.map((item) => <InterviewDetailCard item={item} key={item.id} />) : (
          <div className="rounded-aura-sm border border-dashed border-harbor/20 bg-white p-5 text-center">
            <CalendarDays className="mx-auto text-aura-text-muted" size={22} aria-hidden="true" />
            <p className="mb-0 mt-3 text-sm font-semibold text-depth">{filtered ? 'No interviews match the selected filters' : 'No interviews for the selected day'}</p>
          </div>
        )}
      </div>
    </aside>
  )
}

function InterviewDetailCard({ item }: { item: CalendarInterview }) {
  const names = item.interviewers.map((person) => person.name).join(', ') || 'Unassigned'
  const cancelled = item.status === 'CANCELLED'
  return (
    <article className={`rounded-aura-sm border bg-white p-4 shadow-aura-xs ${cancelled ? 'border-harbor/10 opacity-70' : 'border-harbor/15'}`}>
      <div className="flex items-start gap-3">
        <span className="inline-grid size-10 shrink-0 place-items-center rounded-full bg-glacier/15 text-xs font-bold text-harbor" aria-hidden="true">{initials(item.candidateName)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h3 className={`m-0 text-sm font-semibold text-depth ${cancelled ? 'line-through' : ''}`}>{item.candidateName}</h3><p className="mb-0 mt-0.5 text-xs text-aura-text-muted">{item.jobTitle}</p></div>
            <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
          </div>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 text-xs text-aura-text-secondary">
        <div className="flex gap-2"><Clock3 className="mt-0.5 shrink-0" size={13} /><div><dt className="sr-only">Time</dt><dd className="m-0">{formatCalendarTime(item.scheduledStart, item.timezone)}–{formatCalendarTime(item.scheduledEnd, item.timezone)} · {item.timezone}</dd></div></div>
        <div className="flex gap-2"><UserRound className="mt-0.5 shrink-0" size={13} /><div><dt className="sr-only">Interviewer</dt><dd className="m-0">{names} · {typeLabel(item.interviewType)}</dd></div></div>
        {item.location ? <div className="flex gap-2"><MapPin className="mt-0.5 shrink-0" size={13} /><div><dt className="sr-only">Location</dt><dd className="m-0">{item.location}</dd></div></div> : null}
      </dl>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-harbor/10 pt-3">
        <Link className="text-xs font-semibold text-harbor no-underline hover:text-depth" to={`/candidates/${encodeURIComponent(backendWorkspaceMode ? item.applicationId : item.candidateId)}`}>View candidate</Link>
        <Link className="text-xs font-semibold text-harbor no-underline hover:text-depth" to={`/interviews/${encodeURIComponent(item.id)}`}>View interview</Link>
        {isValidMeetingUrl(item.meetingUrl) ? <a className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-harbor no-underline hover:text-depth" href={item.meetingUrl} rel="noreferrer" target="_blank">Join meeting <ExternalLink size={12} /></a> : null}
      </div>
    </article>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return <Card className="p-4"><p className="m-0 text-[10px] font-bold uppercase tracking-[0.13em] text-aura-text-muted">{label}</p><div className="mt-2 flex items-end justify-between gap-2"><p className="m-0 text-3xl font-bold tracking-[-0.04em] text-depth">{value}</p>{detail ? <p className="m-0 text-xs text-aura-text-secondary">{detail}</p> : null}</div></Card>
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-aura-text-muted">{label}<select className="h-10 min-w-36 rounded-aura-sm border border-harbor/20 bg-white px-2 text-xs font-medium normal-case tracking-normal text-depth" value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
}

function CalendarLoading() {
  return <div className="grid min-h-[520px] animate-pulse place-items-center bg-frost/35" role="status"><div className="text-center"><CalendarDays className="mx-auto text-marine" size={28} /><p className="mb-0 mt-3 text-sm font-semibold text-depth">Loading interview calendar…</p></div></div>
}

function CalendarErrorState({ title, message, retry }: { title: string; message: string; retry?: () => void | Promise<void> }) {
  return <div className="grid min-h-80 place-items-center px-5 py-10"><div className="max-w-md text-center"><AlertCircle className="mx-auto text-aura-danger" size={30} /><h2 className="mb-0 mt-4 text-lg font-semibold text-depth">{title}</h2><p className="mb-0 mt-2 text-sm leading-6 text-aura-text-secondary">{message}</p>{retry ? <Button className="mt-5" variant="secondary" onClick={() => void retry()}><RotateCcw size={14} />Retry</Button> : null}</div></div>
}

function EmptyNotice({ message }: { message: string }) {
  return <p className="mb-0 mt-3 text-xs text-aura-text-muted" role="status">{message}</p>
}

function buildFilterOptions(items: CalendarInterview[]) {
  const unique = (entries: Array<{ value: string; label: string }>) => [...new Map(entries.map((entry) => [entry.value, entry])).values()].sort((a, b) => a.label.localeCompare(b.label))
  return {
    jobs: unique(items.map((item) => ({ value: item.jobId, label: item.jobTitle }))),
    statuses: unique(items.map((item) => ({ value: item.status, label: statusLabel(item.status) }))),
    interviewers: unique(items.flatMap((item) => item.interviewers.map((person) => ({ value: person.id, label: person.name })))),
    types: unique(items.map((item) => ({ value: item.interviewType, label: typeLabel(item.interviewType) }))),
  }
}

function buildMonthCells(month: Date) {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))
  const gridStart = new Date(first)
  gridStart.setUTCDate(1 - first.getUTCDay())
  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(gridStart)
    value.setUTCDate(gridStart.getUTCDate() + index)
    return { key: dateKey(value), day: value.getUTCDate(), inMonth: value.getUTCMonth() === month.getUTCMonth() }
  })
}

function getMonthRange(month: Date) {
  return { start: dateKey(month), end: dateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1))) }
}

function monthStart(value: Date) { return new Date(Date.UTC(value.getFullYear(), value.getMonth(), 1)) }
function dateKey(value: Date) { return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}` }
function formatMonth(value: Date) { return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(value) }
function formatShortDate(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') }
function typeLabel(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase()) }
function statusLabel(value: string) { return typeLabel(value) }
function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'accent' {
  if (status === 'COMPLETED' || status === 'CONFIRMED') return 'success'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'neutral'
  if (status === 'NEEDS_RESCHEDULING' || status === 'PENDING_CONFIRMATION' || status === 'DRAFT') return 'warning'
  return 'accent'
}

function getCalendarError(error: unknown) {
  if (!error) return undefined
  if (error instanceof ApiError && error.status === 401) return { title: 'Authentication required', message: 'Sign in again to view the interview calendar.', retry: false }
  if (error instanceof ApiError && error.status === 403) return { title: 'You do not have permission to view this calendar', message: 'Ask an administrator to grant calendar access.', retry: false }
  return { title: 'Unable to load the interview calendar', message: 'The calendar service could not be reached. Check the backend connection and try again.', retry: true }
}

import { BriefcaseBusiness, CalendarClock, ClipboardCheck, Crown, LayoutDashboard, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logo from '../../assets/logo.png'

// Inactive: hover fades in a subtle background + brightens text
// Active: solid left border animates in via border-l-2 → border-l-[3px] scale
const getLinkClass = (isActive: boolean) => {
  const base = 'flex min-h-10 items-center gap-2.5 border-l-2 px-3 py-2 text-sm font-semibold no-underline transition-all duration-200 ease-in-out max-[680px]:text-[0px] max-[680px]:[&_svg]:size-5'
  if (isActive) {
    return `${base} border-[#C7FF38] bg-[#2D3033]/40 text-[#C7FF38]`
  }
  return `${base} border-transparent text-white/60 hover:bg-white/5 hover:text-[#C7FF38] hover:border-l-[#C7FF38]/40`
}

export function Sidebar() {
  return (
    <aside className="static flex items-center justify-between border-r border-white/10 bg-depth px-5 py-4 text-frost lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-stretch lg:px-5 lg:py-6">
      <div>
        <div
          className="flex items-center gap-3 lg:pb-7"
          aria-label="RECURIMENT admin workspace"
        >
          <img src={logo} alt="RECURIMENT logo" className="size-8 flex-none object-contain" />
          <span className="grid gap-0.5 max-[680px]:hidden">
            <span className="text-[16px] font-bold tracking-[-0.01em] text-white">
              RECURIMENT
            </span>
          </span>
        </div>
        <nav className="flex items-center gap-1 lg:grid lg:gap-5" aria-label="Admin navigation">
          <div className="lg:grid lg:gap-1">
            <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30 lg:block">
              Overview
            </p>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <LayoutDashboard size={18} aria-hidden="true" />
              Dashboard
            </NavLink>
          </div>
          <div className="flex items-center gap-1 lg:grid lg:gap-1">
            <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30 lg:block">
              Recruitment
            </p>
            <NavLink
              to="/jobs"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <BriefcaseBusiness size={18} aria-hidden="true" />
              Job Management
            </NavLink>
            <NavLink
              to="/candidates"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <Users size={18} aria-hidden="true" />
              Candidates
            </NavLink>
            <NavLink
              to="/reviews"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <ClipboardCheck size={18} aria-hidden="true" />
              Review Queue
            </NavLink>
            <NavLink
              to="/interviews"
              className={({ isActive }) => getLinkClass(isActive)}
            >
              <CalendarClock size={18} aria-hidden="true" />
              Interviews
            </NavLink>
          </div>
        </nav>
      </div>
      <div className="hidden rounded-[18px] border border-[#C7FF38]/25 bg-white/[0.06] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] lg:block">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#C7FF38] text-depth">
            <Crown size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C7FF38]">Premium</p>
            <p className="m-0 mt-1 text-sm font-semibold text-white">Premium account</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

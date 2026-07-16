import { BriefcaseBusiness, CalendarClock, ClipboardCheck, LayoutDashboard, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logo from '../../assets/logo.png'

const navLinkClass =
  'flex min-h-10 items-center gap-2.5 border-l-2 border-transparent px-3 py-2 text-sm font-semibold text-frost/70 no-underline transition-colors duration-150 hover:bg-white/5 hover:text-white max-[680px]:text-[0px] max-[680px]:[&_svg]:size-5'

export function Sidebar() {
  return (
    <aside className="static flex items-center justify-between border-r border-white/10 bg-depth px-5 py-4 text-frost lg:sticky lg:top-0 lg:block lg:h-screen lg:px-5 lg:py-6">
      <div
        className="flex items-center gap-3 lg:pb-7"
        aria-label="AURA AI admin workspace"
      >
        <img src={logo} alt="AURA Logo" className="size-8 flex-none object-contain" />
        <span className="grid gap-0.5">
          <span className="text-[16px] font-bold tracking-[-0.01em]">
            AURA AI
          </span>
          <span className="hidden text-[11px] font-medium text-frost/55 lg:block">
            Recruitment Operations
          </span>
        </span>
      </div>
      <nav className="flex items-center gap-1 lg:grid lg:gap-5" aria-label="Admin navigation">
        <div className="lg:grid lg:gap-1">
          <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-frost/40 lg:block">
            Overview
          </p>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${navLinkClass}${isActive ? ' border-glacier bg-marine/35 text-white' : ''}`
            }
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            Dashboard
          </NavLink>
        </div>
        <div className="flex items-center gap-1 lg:grid lg:gap-1">
          <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-frost/40 lg:block">
            Recruitment
          </p>
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `${navLinkClass}${isActive ? ' border-glacier bg-marine/35 text-white' : ''}`
            }
          >
            <BriefcaseBusiness size={18} aria-hidden="true" />
            Job Openings
          </NavLink>
          <NavLink
            to="/candidates"
            className={({ isActive }) =>
              `${navLinkClass}${isActive ? ' border-glacier bg-marine/35 text-white' : ''}`
            }
          >
            <Users size={18} aria-hidden="true" />
            Candidates
          </NavLink>
          <NavLink
            to="/reviews"
            className={({ isActive }) =>
              `${navLinkClass}${isActive ? ' border-glacier bg-marine/35 text-white' : ''}`
            }
          >
            <ClipboardCheck size={18} aria-hidden="true" />
            Review Queue
          </NavLink>
          <NavLink
            to="/interviews"
            className={({ isActive }) =>
              `${navLinkClass}${isActive ? ' border-glacier bg-marine/35 text-white' : ''}`
            }
          >
            <CalendarClock size={18} aria-hidden="true" />
            Interviews
          </NavLink>
        </div>
      </nav>
    </aside>
  )
}

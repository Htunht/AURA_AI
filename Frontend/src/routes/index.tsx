import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import ApplicationFormBuilder from '../pages/ApplicationFormBuilder'
import CandidateDetail from '../pages/CandidateDetail'
import Candidates from '../pages/Candidates'
import Dashboard from '../pages/Dashboard'
import JobDetail from '../pages/JobDetail'
import Jobs from '../pages/Jobs'
import HumanReviewQueue from '../pages/HumanReviewQueue'
import Login from '../pages/Login'
import PublicJobApplication from '../pages/PublicJobApplication'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/candidates" element={<Candidates />} />
        <Route path="/reviews" element={<HumanReviewQueue />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/jobs/:jobId/candidates" element={<Candidates />} />
        <Route
          path="/jobs/:jobId/application-form"
          element={<ApplicationFormBuilder />}
        />
        <Route path="/candidates/:candidateId" element={<CandidateDetail />} />
      </Route>

      <Route path="/apply/:jobId" element={<PublicJobApplication />} />
    </Routes>
  )
}

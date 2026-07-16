import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { SkeletonPage } from '../components/ui/SkeletonPage'

const ApplicationFormBuilder = lazy(() => import('../pages/ApplicationFormBuilder'))
const CandidateDetail = lazy(() => import('../pages/CandidateDetail'))
const Candidates = lazy(() => import('../pages/Candidates'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const JobDetail = lazy(() => import('../pages/JobDetail'))
const Jobs = lazy(() => import('../pages/Jobs'))
const HumanReviewQueue = lazy(() => import('../pages/HumanReviewQueue'))
const Login = lazy(() => import('../pages/Login'))
const PublicJobApplication = lazy(() => import('../pages/PublicJobApplication'))

export function AppRoutes() {
  return (
    <Suspense fallback={<SkeletonPage />}>
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
    </Suspense>
  )
}

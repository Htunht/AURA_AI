import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import ApplicationFormBuilder from '../pages/ApplicationFormBuilder'
import CandidateDetail from '../pages/CandidateDetail'
import Candidates from '../pages/Candidates'
import Dashboard from '../pages/Dashboard'
import JobDetail from '../pages/JobDetail'
import JobCreate from '../pages/JobCreate'
import JobEdit from '../pages/JobEdit'
import Jobs from '../pages/Jobs'
import HumanReviewQueue from '../pages/HumanReviewQueue'
import InterviewDetail from '../pages/InterviewDetail'
import InterviewSchedulingExceptions from '../pages/InterviewSchedulingExceptions'
import InterviewSchedulingPolicies from '../pages/InterviewSchedulingPolicies'
import InterviewSchedulingPolicyEditor from '../pages/InterviewSchedulingPolicyEditor'
import InterviewSchedule from '../pages/InterviewSchedule'
import Interviews from '../pages/Interviews'
import Login from '../pages/Login'
import PublicJobApplication from '../pages/PublicJobApplication'
import PublicInterviewScheduling from '../pages/PublicInterviewScheduling'
import ScreeningRubricEditor from '../pages/ScreeningRubricEditor'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/candidates" element={<Candidates />} />
        <Route path="/reviews" element={<HumanReviewQueue />} />
        <Route path="/interviews" element={<Interviews />} />
        <Route path="/interviews/schedule" element={<InterviewSchedule />} />
        <Route path="/interviews/policies" element={<InterviewSchedulingPolicies />} />
        <Route path="/interviews/policies/:jobId" element={<InterviewSchedulingPolicyEditor />} />
        <Route path="/interviews/exceptions" element={<InterviewSchedulingExceptions />} />
        <Route path="/interviews/:interviewId" element={<InterviewDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/new" element={<JobCreate />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/jobs/:jobId/edit" element={<JobEdit />} />
        <Route path="/jobs/:jobId/candidates" element={<Candidates />} />
        <Route
          path="/jobs/:jobId/application-form"
          element={<ApplicationFormBuilder />}
        />
        <Route path="/jobs/:jobId/screening-rubric" element={<ScreeningRubricEditor />} />
        <Route path="/candidates/:candidateId" element={<CandidateDetail />} />
      </Route>

      <Route path="/apply/:jobId" element={<PublicJobApplication />} />
      <Route path="/schedule/:token" element={<PublicInterviewScheduling />} />
    </Routes>
  )
}

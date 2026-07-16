import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
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
import InterviewSchedulingPolicyEditor from '../pages/InterviewSchedulingPolicyEditor'
import InterviewSchedulingPolicies from '../pages/InterviewSchedulingPolicies'
import InterviewSchedulingSettings from '../pages/InterviewSchedulingSettings'
import InterviewDepartmentTemplates from '../pages/InterviewDepartmentTemplates'
import InterviewDepartmentTemplateEditor from '../pages/InterviewDepartmentTemplateEditor'
import InterviewSchedule from '../pages/InterviewSchedule'
import Interviews from '../pages/Interviews'
import Login from '../pages/Login'
import PublicJobApplication from '../pages/PublicJobApplication'
import PublicInterviewScheduling from '../pages/PublicInterviewScheduling'
import ScreeningRubricEditor from '../pages/ScreeningRubricEditor'
import HiringWorkflowSetup from '../pages/HiringWorkflowSetup'

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
        <Route path="/interviews/settings" element={<InterviewSchedulingSettings />} />
        <Route path="/interviews/settings/organization" element={<InterviewSchedulingPolicyEditor scope="ORGANIZATION" />} />
        <Route path="/interviews/settings/departments" element={<InterviewDepartmentTemplates />} />
        <Route path="/interviews/settings/departments/:department" element={<InterviewDepartmentTemplateEditor />} />
        <Route path="/interviews/policies" element={<InterviewSchedulingPolicies />} />
        <Route path="/interviews/policies/:jobId" element={<InterviewSchedulingPolicyEditor />} />
        <Route path="/interviews/exceptions" element={<InterviewSchedulingExceptions />} />
        <Route path="/interviews/:interviewId" element={<InterviewDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/new" element={<JobCreate />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/jobs/:jobId/edit" element={<JobEdit />} />
        <Route path="/jobs/:jobId/setup" element={<HiringWorkflowSetup />} />
        <Route path="/jobs/:jobId/candidates" element={<Candidates />} />
        <Route
          path="/jobs/:jobId/application-form"
          element={<LegacyApplicationFormRedirect />}
        />
        <Route path="/jobs/:jobId/screening-rubric" element={<ScreeningRubricEditor />} />
        <Route path="/candidates/:candidateId" element={<CandidateDetail />} />
      </Route>

      <Route path="/apply/:jobId" element={<PublicJobApplication />} />
      <Route path="/schedule/:token" element={<PublicInterviewScheduling />} />
    </Routes>
  )
}

function LegacyApplicationFormRedirect() {
  const { jobId = '' } = useParams()
  return <Navigate to={`/jobs/${jobId}/setup?step=form`} replace />
}

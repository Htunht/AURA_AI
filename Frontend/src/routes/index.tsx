import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { SkeletonPage } from '../components/ui/SkeletonPage'

const CandidateDetail = lazy(() => import('../pages/CandidateDetail'))
const Candidates = lazy(() => import('../pages/Candidates'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const JobDetail = lazy(() => import('../pages/JobDetail'))
const JobCreate = lazy(() => import('../pages/JobCreate'))
const JobEdit = lazy(() => import('../pages/JobEdit'))
const Jobs = lazy(() => import('../pages/Jobs'))
const HumanReviewQueue = lazy(() => import('../pages/HumanReviewQueue'))
const InterviewDetail = lazy(() => import('../pages/InterviewDetail'))
const InterviewSchedulingExceptions = lazy(() => import('../pages/InterviewSchedulingExceptions'))
const InterviewSchedulingPolicyEditor = lazy(() => import('../pages/InterviewSchedulingPolicyEditor'))
const InterviewSchedulingPolicies = lazy(() => import('../pages/InterviewSchedulingPolicies'))
const InterviewSchedulingSettings = lazy(() => import('../pages/InterviewSchedulingSettings'))
const InterviewDepartmentTemplates = lazy(() => import('../pages/InterviewDepartmentTemplates'))
const InterviewDepartmentTemplateEditor = lazy(() => import('../pages/InterviewDepartmentTemplateEditor'))
const InterviewSchedule = lazy(() => import('../pages/InterviewSchedule'))
const Interviews = lazy(() => import('../pages/Interviews'))
const Login = lazy(() => import('../pages/Login'))
const PublicJobApplication = lazy(() => import('../pages/PublicJobApplication'))
const PublicInterviewScheduling = lazy(() => import('../pages/PublicInterviewScheduling'))
const ScreeningRubricEditor = lazy(() => import('../pages/ScreeningRubricEditor'))
const HiringWorkflowSetup = lazy(() => import('../pages/HiringWorkflowSetup'))
const InterviewQuestionReview = lazy(() => import('../pages/InterviewQuestionReview'))
const InterviewSession = lazy(() => import('../pages/InterviewSession'))

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
          <Route path="/interviews" element={<Interviews />} />
          <Route path="/interviews/schedule" element={<InterviewSchedule />} />
          <Route path="/interviews/settings" element={<InterviewSchedulingSettings />} />
          <Route path="/interviews/settings/organization" element={<InterviewSchedulingPolicyEditor scope="ORGANIZATION" />} />
          <Route path="/interviews/settings/departments" element={<InterviewDepartmentTemplates />} />
          <Route path="/interviews/settings/departments/:department" element={<InterviewDepartmentTemplateEditor />} />
          <Route path="/interviews/policies" element={<InterviewSchedulingPolicies />} />
          <Route path="/interviews/policies/:jobId" element={<InterviewSchedulingPolicyEditor />} />
          <Route path="/interviews/exceptions" element={<InterviewSchedulingExceptions />} />
          <Route path="/interviews/:interviewId/questions" element={<InterviewQuestionReview />} />
          <Route path="/interviews/:interviewId/session" element={<InterviewSession />} />
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
    </Suspense>
  )
}

function LegacyApplicationFormRedirect() {
  const { jobId = '' } = useParams()
  return <Navigate to={`/jobs/${jobId}/setup?step=form`} replace />
}


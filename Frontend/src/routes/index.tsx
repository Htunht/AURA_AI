import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppShell } from '../app/AppShell'
import { SkeletonPage } from '../components/ui/SkeletonPage'

const CandidateDetail = lazy(() => import('../pages/candidates/CandidateDetail'))
const Candidates = lazy(() => import('../pages/candidates/Candidates'))
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'))
const JobDetail = lazy(() => import('../pages/jobs/JobDetail'))
const JobCreate = lazy(() => import('../pages/jobs/JobCreate'))
const JobEdit = lazy(() => import('../pages/jobs/JobEdit'))
const Jobs = lazy(() => import('../pages/jobs/Jobs'))
const HumanReviewQueue = lazy(() => import('../pages/reviews/HumanReviewQueue'))
const InterviewDetail = lazy(() => import('../pages/interviews/InterviewDetail'))
const InterviewSchedulingExceptions = lazy(() => import('../pages/interviews/InterviewSchedulingExceptions'))
const InterviewSchedulingPolicyEditor = lazy(() => import('../pages/interviews/InterviewSchedulingPolicyEditor'))
const InterviewSchedulingPolicies = lazy(() => import('../pages/interviews/InterviewSchedulingPolicies'))
const InterviewSchedulingSettings = lazy(() => import('../pages/interviews/InterviewSchedulingSettings'))
const InterviewDepartmentTemplates = lazy(() => import('../pages/interviews/InterviewDepartmentTemplates'))
const InterviewDepartmentTemplateEditor = lazy(() => import('../pages/interviews/InterviewDepartmentTemplateEditor'))
const InterviewSchedule = lazy(() => import('../pages/interviews/InterviewSchedule'))
const Interviews = lazy(() => import('../pages/interviews/Interviews'))
const Login = lazy(() => import('../pages/auth/Login'))
const PublicJobApplication = lazy(() => import('../pages/public/PublicJobApplication'))
const PublicInterviewScheduling = lazy(() => import('../pages/public/PublicInterviewScheduling'))
const ScreeningRubricEditor = lazy(() => import('../pages/jobs/ScreeningRubricEditor'))
const HiringWorkflowSetup = lazy(() => import('../pages/jobs/HiringWorkflowSetup'))
const InterviewQuestionReview = lazy(() => import('../pages/interviews/InterviewQuestionReview'))
const InterviewSession = lazy(() => import('../pages/interviews/InterviewSession'))
const InterviewTranscript = lazy(() => import('../pages/InterviewTranscript'))
const InterviewAnalysis = lazy(() => import('../pages/InterviewAnalysis'))

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
          <Route path="/interviews/:interviewId/transcript" element={<InterviewTranscript />} />
          <Route path="/interviews/:interviewId/analysis" element={<InterviewAnalysis />} />
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

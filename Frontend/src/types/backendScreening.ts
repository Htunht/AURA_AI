export type BackendScreeningStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string

export type RecruiterScreeningListItem = {
  application_id: string
  screening_run_id: string | null
  job_id: string
  candidate_name: string
  candidate_email: string
  job_title: string
  submission_status: string
  screening_status: BackendScreeningStatus | null
  recommendation: string | null
  weighted_score: number | null
  assessed_coverage: number | null
  submitted_at: string
  completed_at: string | null
  requires_human_review: boolean
}

export type RecruiterScreeningDetail = {
  application_id: string
  screening_run_id: string | null
  candidate: {
    id: string
    full_name: string
    email: string
    phone: string | null
  }
  job: {
    id: string
    title: string
    department: string | null
    description: string
  }
  submission_status: string
  screening_status: BackendScreeningStatus | null
  weighted_score: number | null
  assessed_coverage: number | null
  recommendation: string | null
  overall_confidence: string | null
  overall_strengths: string[]
  overall_concerns: string[]
  unresolved_requirements: string[]
  data_quality_warnings: string[]
  cv_extraction_status: string
  github_repository_url: string | null
  github_analysis: Record<string, unknown> | null
  error_code: string | null
  safe_error_detail: string | null
  submitted_at: string
  started_at: string | null
  completed_at: string | null
  requires_human_review: boolean
  criterion_results: Array<{
    criterion_key: string
    suggested_rating: number | null
    normalized_score: number | null
    weight: number
    weighted_contribution: number | null
    confidence: string
    evidence_summary: string
    strengths: string[]
    concerns: string[]
    missing_evidence: string[]
    requires_human_review: boolean
  }>
  evidence_references: Array<{
    criterion_key: string
    evidence_id: string
    source_type: 'APPLICATION_FORM' | 'CV' | 'GITHUB' | 'SYSTEM' | string
    explanation: string
  }>
  human_reviews: Array<{
    id: string
    screening_run_id: string
    action: string
    override_reason: string | null
    reviewer_notes: string | null
    created_at: string
  }>
}

export type HumanScreeningReviewPayload = {
  action:
    | 'CONFIRM_ADVANCE'
    | 'CONFIRM_HOLD'
    | 'CONFIRM_DO_NOT_ADVANCE'
    | 'OVERRIDE_TO_ADVANCE'
    | 'OVERRIDE_TO_HOLD'
    | 'OVERRIDE_TO_DO_NOT_ADVANCE'
    | 'REQUEST_MORE_EVIDENCE'
  override_reason?: string
  reviewer_notes?: string
}

export type PublicBackendApplicationForm = {
  job_id: string
  title: string
  department: string | null
  description: string
  cv_required: boolean
  github_repository_required: boolean
  fields: Array<{
    id: string
    key: string
    label: string
    type: string
    required: boolean
    placeholder?: string | null
    helpText?: string | null
    options: Array<{ id: string; label: string; value: string }>
    linkedRequirementCodes: string[]
  }>
}


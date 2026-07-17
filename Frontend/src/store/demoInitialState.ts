import applicationsData from '../data/applications.json'
import applicationFormsData from '../data/applicationForms.json'
import candidatesData from '../data/candidates.json'
import communicationsData from '../data/communications.json'
import evaluationsData from '../data/evaluations.json'
import interviewsData from '../data/interviews.json'
import interviewSchedulingPoliciesData from '../data/interviewSchedulingPolicies.json'
import jobsData from '../data/jobs.json'
import rubricsData from '../data/rubrics.json'
import transcriptsData from '../data/transcripts.json'
import type { Application } from '../types/application'
import type { ApplicationForm } from '../types/applicationForm'
import type { Candidate } from '../types/candidate'
import type { Communication } from '../types/communication'
import type { Evaluation } from '../types/evaluation'
import type { Interview } from '../types/interview'
import type { InterviewSchedulingPolicy } from '../types/interviewSchedulingPolicy'
import type { Job } from '../types/job'
import type { EvaluationRubric } from '../types/rubric'
import type { Transcript } from '../types/transcript'
import { validateDemoData } from '../utils/demoDataValidation'
import type { DemoState } from './demoStateTypes'

const jobs = jobsData as Job[]
const candidates = candidatesData as Candidate[]
const applications = applicationsData as Application[]
const applicationForms = applicationFormsData as ApplicationForm[]
const rubrics = rubricsData as EvaluationRubric[]
const evaluations = evaluationsData as Evaluation[]
const interviews = interviewsData as Interview[]
const interviewSchedulingPolicies = interviewSchedulingPoliciesData as InterviewSchedulingPolicy[]
const transcripts = transcriptsData as Transcript[]
const communications = communicationsData as Communication[]

const validationResult = validateDemoData()

if (!validationResult.valid) {
  console.error('Invalid AURA AI demo data:', validationResult.errors)
}

export function createInitialDemoState(): DemoState {
  return {
    jobs: jobs.map((job) => ({
      ...job,
      requiredSkills: job.requiredSkills.map((skill) => ({ ...skill })),
    })),
    candidates: candidates.map((candidate) => ({
      ...candidate,
      skills: [...candidate.skills],
    })),
    applications: applications.map((application) => ({
      ...application,
      answers: application.answers.map((answer) => ({
        ...answer,
        value: Array.isArray(answer.value) ? [...answer.value] : answer.value,
      })),
      documents: application.documents.map((document) => ({ ...document })),
    })),
    applicationForms: applicationForms.map((form) => ({
      ...form,
      fields: form.fields.map((field) => ({
        ...field,
        options: field.options?.map((option) => ({ ...option })),
        screeningMapping: field.screeningMapping ? { ...field.screeningMapping, requirementIds: [...field.screeningMapping.requirementIds], criterionKeys: [...field.screeningMapping.criterionKeys] } : undefined,
      })),
    })),
    rubrics: rubrics.map((rubric) => ({
      ...rubric,
      criteria: rubric.criteria.map((criterion) => ({ ...criterion })),
      requirementRules: rubric.requirementRules?.map((rule) => ({ ...rule, fieldKeys: [...rule.fieldKeys] })),
    })),
    evaluations: evaluations.map((evaluation) => ({
      ...evaluation,
      strengths: evaluation.strengths.map((insight) => ({
        ...insight,
        evidence: insight.evidence.map((evidence) => ({ ...evidence })),
      })),
      concerns: evaluation.concerns.map((insight) => ({
        ...insight,
        evidence: insight.evidence.map((evidence) => ({ ...evidence })),
      })),
      criterionScores: evaluation.criterionScores.map((criterion) => ({
        ...criterion,
        evidence: criterion.evidence.map((evidence) => ({ ...evidence })),
      })),
    })),
    interviews: interviews.map((interview) => ({
      ...interview,
      interviewers: interview.interviewers.map((interviewer) => ({
        ...interviewer,
      })),
      questions: interview.questions.map((question) => ({ ...question })),
    })),
    interviewQuestionSets: [],
    interviewSessions: [],
    interviewTranscripts: [],
    interviewAnalyses: [],
    interviewSchedulingPolicies: interviewSchedulingPolicies.map((policy) => ({
      ...policy,
      workingDays: [...policy.workingDays],
      requiredInterviewerRoles: [...policy.requiredInterviewerRoles],
      fixedInterviewerIds: [...policy.fixedInterviewerIds],
    })),
    interviewSchedulingInvitations: [],
    transcripts: transcripts.map((transcript) => ({
      ...transcript,
      segments: transcript.segments.map((segment) => ({ ...segment })),
    })),
    communications: communications.map((communication) => ({
      ...communication,
    })),
    decisions: [],
    screeningQueue: [],
  }
}

export const initialDemoState = createInitialDemoState()

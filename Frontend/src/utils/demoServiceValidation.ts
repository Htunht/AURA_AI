import {
  analyzeInterview,
  generateCandidateEmail,
  generateInterviewQuestions,
  runCandidateScreening,
  runFinalEvaluation,
  suggestApplicationQuestions,
} from '../services/ai'
import { DemoServiceError } from '../services/DemoServiceError'
import { transcribeInterview } from '../services/transcription'
import { initialDemoState } from '../store/demoReducer'
import { calculateWeightedScore } from './score'

export type DemoServiceValidationResult = {
  valid: boolean
  errors: string[]
}

function recordCheck(errors: string[], condition: boolean, message: string) {
  if (!condition) {
    errors.push(message)
  }
}

export async function validateDemoServices(): Promise<DemoServiceValidationResult> {
  const errors: string[] = []
  const sourceBefore = JSON.stringify({
    applications: initialDemoState.applications,
    evaluations: initialDemoState.evaluations,
    interviews: initialDemoState.interviews,
    transcripts: initialDemoState.transcripts,
    communications: initialDemoState.communications,
    jobs: initialDemoState.jobs,
    rubrics: initialDemoState.rubrics,
    applicationForms: initialDemoState.applicationForms,
  })

  const suggestionJob = initialDemoState.jobs.find(
    (job) => job.id === 'job-001',
  )
  const suggestionRubric = initialDemoState.rubrics.find(
    (rubric) => rubric.jobId === 'job-001',
  )
  const suggestionForm = initialDemoState.applicationForms.find(
    (form) => form.jobId === 'job-001' && form.status === 'PUBLISHED',
  )

  if (!suggestionJob || !suggestionRubric || !suggestionForm) {
    errors.push('job-001 suggestion validation fixtures are incomplete')
  } else {
    const suggestionSourceBefore = JSON.stringify({
      job: suggestionJob,
      rubric: suggestionRubric,
      fields: suggestionForm.fields,
    })
    const suggestionResult = await suggestApplicationQuestions({
      job: suggestionJob,
      rubric: suggestionRubric,
      existingFields: suggestionForm.fields,
      delayMs: 0,
    })
    const suggestionIds = suggestionResult.suggestions.map(
      (suggestion) => suggestion.id,
    )
    const suggestedFieldKeys = suggestionResult.suggestions.map(
      (suggestion) => suggestion.field.key,
    )
    const existingFieldKeys = new Set(
      suggestionForm.fields.map((field) => field.key),
    )
    const criterionKeys = new Set(
      suggestionRubric.criteria.map((criterion) => criterion.key),
    )
    const supportedFieldTypes = new Set([
      'TEXT',
      'EMAIL',
      'PHONE',
      'URL',
      'NUMBER',
      'TEXTAREA',
      'MULTI_SELECT',
      'FILE',
    ])

    recordCheck(
      errors,
      suggestionResult.jobId === 'job-001' &&
        suggestionResult.suggestions.length > 0,
      'Application question suggestions were not returned for job-001',
    )
    recordCheck(
      errors,
      new Set(suggestionIds).size === suggestionIds.length,
      'Application question suggestion IDs are not unique',
    )
    recordCheck(
      errors,
      new Set(suggestedFieldKeys).size === suggestedFieldKeys.length,
      'Suggested application field keys are not unique',
    )
    recordCheck(
      errors,
      suggestedFieldKeys.every((key) => !existingFieldKeys.has(key)),
      'An existing application field key was suggested',
    )
    recordCheck(
      errors,
      suggestionResult.suggestions.every((suggestion) =>
        suggestion.targetCriterionKeys.every((key) => criterionKeys.has(key)),
      ),
      'An application question suggestion targets an unknown rubric criterion',
    )
    recordCheck(
      errors,
      suggestionResult.suggestions.every((suggestion) =>
        supportedFieldTypes.has(suggestion.field.type),
      ),
      'An application question suggestion uses an unsupported field type',
    )
    recordCheck(
      errors,
      JSON.stringify({
        job: suggestionJob,
        rubric: suggestionRubric,
        fields: suggestionForm.fields,
      }) === suggestionSourceBefore,
      'Application question suggestion generation mutated its inputs',
    )

    const suggestionsWithTestingField = await suggestApplicationQuestions({
      job: suggestionJob,
      rubric: suggestionRubric,
      existingFields: [
        ...suggestionForm.fields,
        {
          id: 'field-validation-automated-testing',
          key: 'automated_testing_experience',
          label: 'Automated testing experience',
          type: 'TEXTAREA',
          required: false,
        },
      ],
      delayMs: 0,
    })
    recordCheck(
      errors,
      !suggestionsWithTestingField.suggestions.some(
        (suggestion) =>
          suggestion.field.key === 'automated_testing_experience',
      ),
      'An existing automated testing field was suggested again',
    )

    let incompatibleRubricError: DemoServiceError | undefined
    try {
      await suggestApplicationQuestions({
        job: suggestionJob,
        rubric: { ...suggestionRubric, jobId: 'job-incompatible' },
        existingFields: suggestionForm.fields,
        delayMs: 0,
      })
    } catch (error) {
      if (error instanceof DemoServiceError) {
        incompatibleRubricError = error
      }
    }
    recordCheck(
      errors,
      incompatibleRubricError?.code === 'RUBRIC_NOT_FOUND',
      'An incompatible rubric did not throw RUBRIC_NOT_FOUND',
    )
  }

  const screeningResult = await runCandidateScreening({
    applicationId: 'application-001',
    applications: initialDemoState.applications,
    evaluations: initialDemoState.evaluations,
    delayMs: 0,
  })
  const sourceScreening = initialDemoState.evaluations.find(
    (evaluation) => evaluation.id === 'evaluation-screening-001',
  )

  recordCheck(
    errors,
    screeningResult.evaluation.id === 'evaluation-screening-001',
    'Candidate screening did not return John’s screening evaluation',
  )
  recordCheck(
    errors,
    screeningResult.evaluation.recommendation === 'STRONG_YES',
    'John’s screening recommendation is not STRONG_YES',
  )
  recordCheck(
    errors,
    screeningResult.evaluation !== sourceScreening,
    'Candidate screening returned the source evaluation object',
  )

  let missingApplicationError: DemoServiceError | undefined
  try {
    await runCandidateScreening({
      applicationId: 'application-missing',
      applications: initialDemoState.applications,
      evaluations: initialDemoState.evaluations,
      delayMs: 0,
    })
  } catch (error) {
    if (error instanceof DemoServiceError) {
      missingApplicationError = error
    }
  }
  recordCheck(
    errors,
    missingApplicationError?.code === 'APPLICATION_NOT_FOUND',
    'Missing application screening did not throw APPLICATION_NOT_FOUND',
  )

  const questionResult = await generateInterviewQuestions({
    interviewId: 'interview-001',
    interviews: initialDemoState.interviews,
    delayMs: 0,
  })
  const johnInterview = initialDemoState.interviews.find(
    (interview) => interview.id === 'interview-001',
  )
  const questionIds = questionResult.questions.map((question) => question.id)

  recordCheck(
    errors,
    questionResult.interviewId === 'interview-001' &&
      questionResult.questions.length === johnInterview?.questions.length,
    'Interview question generation did not return John’s prepared questions',
  )
  recordCheck(
    errors,
    new Set(questionIds).size === questionIds.length,
    'Generated interview question IDs are not unique',
  )
  recordCheck(
    errors,
    questionResult.questions[0] !== johnInterview?.questions[0],
    'Interview question generation returned source question objects',
  )

  const transcriptionResult = await transcribeInterview({
    interviewId: 'interview-001',
    interviews: initialDemoState.interviews,
    transcripts: initialDemoState.transcripts,
    delayMs: 0,
  })
  const sourceTranscript = initialDemoState.transcripts.find(
    (transcript) => transcript.id === 'transcript-001',
  )

  recordCheck(
    errors,
    transcriptionResult.transcript.status === 'COMPLETED',
    'Transcription did not return a completed transcript',
  )
  recordCheck(
    errors,
    transcriptionResult.transcript.interviewId === 'interview-001',
    'Transcription result does not belong to John’s interview',
  )
  recordCheck(
    errors,
    transcriptionResult.transcript !== sourceTranscript,
    'Transcription returned the source transcript object',
  )

  const analysisResult = await analyzeInterview({
    interviewId: 'interview-001',
    interviews: initialDemoState.interviews,
    transcripts: initialDemoState.transcripts,
    delayMs: 0,
  })
  const transcriptSegmentIds = new Set(
    sourceTranscript?.segments.map((segment) => segment.id) ?? [],
  )
  const analysisEvidence = [
    ...analysisResult.strengths,
    ...analysisResult.concerns,
    ...analysisResult.evidence,
  ].flatMap((insight) => insight.evidence)

  recordCheck(
    errors,
    analysisResult.strengths.length > 0,
    'Interview analysis did not return a strength',
  )
  recordCheck(
    errors,
    analysisEvidence.every((evidence) =>
      transcriptSegmentIds.has(evidence.sourceId),
    ),
    'Interview analysis references an unknown transcript segment',
  )

  const finalResult = await runFinalEvaluation({
    applicationId: 'application-001',
    applications: initialDemoState.applications,
    evaluations: initialDemoState.evaluations,
    delayMs: 0,
  })
  const expectedFinalScore = calculateWeightedScore(
    finalResult.evaluation.criterionScores,
  )
  const sourceFinalEvaluation = initialDemoState.evaluations.find(
    (evaluation) => evaluation.id === 'evaluation-final-001',
  )

  recordCheck(
    errors,
    finalResult.evaluation.id === 'evaluation-final-001' &&
      finalResult.evaluation.recommendation === 'YES',
    'Final evaluation did not return John’s YES recommendation',
  )
  recordCheck(
    errors,
    finalResult.evaluation.overallScore === expectedFinalScore,
    'Final evaluation overall score is not the calculated weighted score',
  )
  recordCheck(
    errors,
    finalResult.evaluation !== sourceFinalEvaluation,
    'Final evaluation returned the source evaluation object',
  )

  const emailResult = await generateCandidateEmail({
    applicationId: 'application-001',
    communications: initialDemoState.communications,
    type: 'NEXT_ROUND',
    delayMs: 0,
  })
  const sourceCommunication = initialDemoState.communications.find(
    (communication) => communication.id === 'communication-001',
  )
  const emailBody = emailResult.communication.body.toLowerCase()
  const unsafeEmailPhrases = [
    '86 / 100',
    'confidence',
    'backend implementation responsibility remains unclear',
  ]

  recordCheck(
    errors,
    emailResult.communication.id === 'communication-001',
    'Candidate email generation did not return John’s communication',
  )
  recordCheck(
    errors,
    unsafeEmailPhrases.every((phrase) => !emailBody.includes(phrase)),
    'John’s candidate email exposes internal evaluation content',
  )
  recordCheck(
    errors,
    emailResult.communication !== sourceCommunication,
    'Candidate email generation returned the source communication object',
  )

  let missingTranscriptError: DemoServiceError | undefined
  try {
    await analyzeInterview({
      interviewId: 'interview-002',
      interviews: initialDemoState.interviews,
      transcripts: initialDemoState.transcripts,
      delayMs: 0,
    })
  } catch (error) {
    if (error instanceof DemoServiceError) {
      missingTranscriptError = error
    }
  }
  recordCheck(
    errors,
    missingTranscriptError?.code === 'TRANSCRIPT_NOT_FOUND',
    'Missing transcript analysis did not throw TRANSCRIPT_NOT_FOUND',
  )

  const sourceAfter = JSON.stringify({
    applications: initialDemoState.applications,
    evaluations: initialDemoState.evaluations,
    interviews: initialDemoState.interviews,
    transcripts: initialDemoState.transcripts,
    communications: initialDemoState.communications,
    jobs: initialDemoState.jobs,
    rubrics: initialDemoState.rubrics,
    applicationForms: initialDemoState.applicationForms,
  })
  recordCheck(
    errors,
    sourceAfter === sourceBefore,
    'A simulated service mutated source state data',
  )

  return {
    valid: errors.length === 0,
    errors,
  }
}

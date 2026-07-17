import type { Application } from '../types/application'
import type { Candidate } from '../types/candidate'
import type { Interview } from '../types/interview'
import type { InterviewQuestionSet } from '../types/interviewQuestionSet'
import type { InterviewSession } from '../types/interviewSession'
import type { InterviewTranscript, InterviewTranscriptSegment } from '../types/interviewTranscript'
import type { Job } from '../types/job'
import { createInterviewTranscriptId, createNextTranscriptSegmentId } from '../utils/interviewPostReviewIds'

export type SimulatedTranscriptInput = {
  interview: Interview
  session: InterviewSession
  questionSet: InterviewQuestionSet
  candidate: Candidate
  application: Application
  job: Job
  generatedAt: string
}

function clean(value: string, maxLength = 420) {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function answerValue(value: Application['answers'][number]['value']) {
  return clean(Array.isArray(value) ? value.join(', ') : String(value))
}

function buildCandidateAnswer(input: SimulatedTranscriptInput, questionIndex: number, notes: string) {
  const note = clean(notes)
  if (note) return note

  const applicationAnswers = input.application.answers.filter((item) => answerValue(item.value))
  const applicationAnswer = applicationAnswers[questionIndex % Math.max(1, applicationAnswers.length)]
  if (applicationAnswer) {
    return clean(`${applicationAnswer.label}: ${answerValue(applicationAnswer.value)}`)
  }

  const skills = input.candidate.skills.slice(0, 4).join(', ')
  const experience = `${input.candidate.yearsExperience} years of documented experience${input.candidate.currentPosition ? ` as ${input.candidate.currentPosition}` : ''}`
  return clean(`${experience}${skills ? `, including ${skills}` : ` relevant to ${input.job.title}`}.`)
}

export function generateSimulatedInterviewTranscript(input: SimulatedTranscriptInput): InterviewTranscript {
  const id = createInterviewTranscriptId(input.interview.id)
  const segments: InterviewTranscriptSegment[] = []
  const add = (speaker: 'INTERVIEWER' | 'CANDIDATE', text: string, questionId: string) => segments.push({
    id: createNextTranscriptSegmentId(segments, input.interview.id),
    transcriptId: id,
    order: segments.length + 1,
    speaker,
    speakerLabel: speaker === 'INTERVIEWER' ? 'Interviewer' : input.candidate.fullName,
    text: clean(text, 900),
    questionId,
    createdAt: input.generatedAt,
    updatedAt: input.generatedAt,
  })

  ;[...input.questionSet.questions]
    .sort((a, b) => a.order - b.order)
    .forEach((question, questionIndex) => {
      const progress = input.session.questionProgress.find((item) => item.questionId === question.id)
      if (progress?.status !== 'ASKED') return
      add('INTERVIEWER', question.text, question.id)
      add('CANDIDATE', buildCandidateAnswer(input, questionIndex, progress.interviewerNotes), question.id)
    })

  const rawText = segments
    .map((item) => `${item.speaker === 'INTERVIEWER' ? 'Interviewer' : 'Candidate'}: ${item.text}`)
    .join('\n\n')

  return {
    id,
    interviewId: input.interview.id,
    sessionId: input.session.id,
    source: 'SIMULATED',
    status: 'DRAFT',
    rawText,
    segments,
    createdAt: input.generatedAt,
    updatedAt: input.generatedAt,
  }
}

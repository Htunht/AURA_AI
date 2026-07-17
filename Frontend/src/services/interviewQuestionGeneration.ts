import type { InterviewQuestion } from '../types/interviewQuestion'
import type { InterviewQuestionGenerationInput, InterviewQuestionGenerationResult } from '../types/interviewQuestionGeneration'

export function getInterviewQuestionBudget(durationMinutes: number) {
  if (durationMinutes >= 90) return { minimum: 12, maximum: 16, usableMinutes: 72 }
  if (durationMinutes >= 60) return { minimum: 9, maximum: 12, usableMinutes: 48 }
  if (durationMinutes >= 45) return { minimum: 7, maximum: 9, usableMinutes: 35 }
  return { minimum: 5, maximum: 7, usableMinutes: 23 }
}

function answerText(input: InterviewQuestionGenerationInput) {
  return input.application.answers.map((answer) => Array.isArray(answer.value) ? answer.value.join(' ') : String(answer.value)).join(' ')
}

function includesEvidence(input: InterviewQuestionGenerationInput, term: string) {
  const haystack = `${input.candidate.skills.join(' ')} ${input.candidate.currentPosition} ${answerText(input)}`.toLocaleLowerCase()
  return haystack.includes(term.toLocaleLowerCase())
}

export function generateInterviewQuestions(input: InterviewQuestionGenerationInput): InterviewQuestionGenerationResult {
  if (!input.interview.id || !input.candidate.id || !input.application.id || !input.job.id) {
    throw new Error('Required candidate, application, role, or interview information is unavailable.')
  }
  const warnings: string[] = []
  const criterionFor = (pattern: RegExp) => input.screeningEvaluation?.criterionScores.find((item) => pattern.test(`${item.criterionKey} ${item.name}`))?.criterionKey
  const criteria = (...keys: Array<string | undefined>) => [...new Set(keys.filter((key): key is string => Boolean(key)))]
  if (!input.form) warnings.push('Published application form context was unavailable.')
  if (!input.screeningEvaluation) warnings.push('Screening context was unavailable; questions use application evidence and role requirements.')
  const budget = getInterviewQuestionBudget(input.durationMinutes)
  const createdAt = input.interview.createdAt ?? input.interview.scheduledStart
  const drafts: Array<Omit<InterviewQuestion, 'id' | 'order'>> = []
  const add = (question: Omit<InterviewQuestion, 'id' | 'order'>) => {
    const normalized = question.text.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
    if (!drafts.some((item) => item.text.trim().toLocaleLowerCase().replace(/\s+/g, ' ') === normalized)) drafts.push(question)
  }
  const base = (overrides: Partial<Omit<InterviewQuestion, 'id' | 'order'>>): Omit<InterviewQuestion, 'id' | 'order'> => ({
    interviewId: input.interview.id, text: '', category: 'ROLE_REQUIREMENT', source: 'SYSTEM_GENERATED', priority: 'CORE', status: 'DRAFT', estimatedMinutes: 4,
    requirementIds: [], criterionKeys: [], evidenceReferences: [], createdAt, updatedAt: createdAt, ...overrides,
  })

  const experienceRequirement = input.requirements.find((item) => item.type === 'MINIMUM_EXPERIENCE')
  add(base({
    text: `What attracted you to the ${input.job.title} role, and which part of your recent work best prepares you for it?`, category: 'INTRODUCTION', estimatedMinutes: 3,
    requirementIds: input.candidate.yearsExperience >= input.job.minimumExperienceYears && experienceRequirement ? [experienceRequirement.id] : [], criterionKeys: criteria(criterionFor(/motivation|alignment|relevant.?experience/i)),
    evidenceReferences: [`Candidate profile · ${input.candidate.yearsExperience} years of experience`],
    generationReason: 'Open with the candidate’s role motivation and most relevant context.', interviewerGuidance: 'Listen for a clear connection between recent work and this role.', expectedEvidence: 'A concise example connecting motivation, responsibilities, and relevant experience.',
  }))

  if (input.candidate.yearsExperience < input.job.minimumExperienceYears) {
    add(base({
      text: `Your application shows ${input.candidate.yearsExperience} years of experience, while this role requests ${input.job.minimumExperienceYears} years. Can you describe the scope, complexity, and ownership of the work you handled during that period?`,
      category: 'SCREENING_FOLLOW_UP', estimatedMinutes: 4, requirementIds: experienceRequirement ? [experienceRequirement.id] : [], criterionKeys: criteria(criterionFor(/experience|seniority/i)),
      evidenceReferences: [`Candidate profile · ${input.candidate.yearsExperience} years of experience`], generationReason: 'Clarify experience below the stated minimum requirement.', interviewerGuidance: 'Explore scope and ownership without treating tenure as a final qualification decision.', expectedEvidence: 'Specific responsibilities, complexity, independent ownership, and observable outcomes.',
    }))
  }

  const requiredSkills = input.requirements.filter((item) => item.type === 'REQUIRED_SKILL')
  requiredSkills.forEach((requirement) => {
    const skill = requirement.skillName ?? requirement.label
    const hasEvidence = includesEvidence(input, skill)
    const criterion = input.screeningEvaluation?.criterionScores.find((item) => item.name.toLocaleLowerCase().includes(skill.toLocaleLowerCase()) || item.criterionKey.toLocaleLowerCase().includes(skill.toLocaleLowerCase().replace(/\s+/g, '_'))) ?? input.screeningEvaluation?.criterionScores.find((item) => /technical|skill|engineering|qualification/i.test(`${item.criterionKey} ${item.name}`))
    add(base({
      text: hasEvidence
        ? `Your application mentions ${skill}. Walk us through the most substantial work you completed with it, the decisions you made, and the outcome.`
        : `This role requires practical experience with ${skill}. Describe the most substantial related work you have completed, including your responsibilities and decisions.`,
      category: hasEvidence ? 'TECHNICAL' : 'MISSING_EVIDENCE', priority: 'CORE', requirementIds: [requirement.id], criterionKeys: criterion ? [criterion.criterionKey] : [],
      evidenceReferences: hasEvidence ? [`Application or candidate profile · ${skill}`] : [], generationReason: hasEvidence ? `The application contained evidence of ${skill}; this question explores depth and ownership.` : `No direct ${skill} evidence was submitted.`, interviewerGuidance: 'Listen for personal contribution, trade-offs, and evidence from real work.', expectedEvidence: 'A concrete example, specific contribution, decisions, and observable outcome.',
    }))
  })

  const strength = input.screeningEvaluation?.strengths[0]
  if (strength) add(base({ text: `The application contained strong evidence in ${strength.title}. Describe a complex example you owned and the trade-offs you considered.`, category: 'SCREENING_FOLLOW_UP', priority: 'FOLLOW_UP', estimatedMinutes: 4, criterionKeys: criteria(input.screeningEvaluation?.criterionScores.find((item) => item.name === strength.title || item.criterionKey === strength.title)?.criterionKey), evidenceReferences: strength.evidence.map((item) => `${item.sourceType} · ${item.excerpt}`), generationReason: `The application contained strong evidence in ${strength.title}; this question checks depth and ownership.`, interviewerGuidance: 'Verify that the candidate personally owned the work described.', expectedEvidence: 'Scope, ownership, trade-offs, outcome, and reflection.' }))

  const concern = input.screeningEvaluation?.concerns[0]
  if (concern) add(base({ text: `Your application provided limited evidence in ${concern.title}. How have you handled this area in practice, and what approach would you use in this role?`, category: 'SCREENING_FOLLOW_UP', priority: 'CORE', estimatedMinutes: 4, criterionKeys: criteria(input.screeningEvaluation?.criterionScores.find((item) => item.name === concern.title || item.criterionKey === concern.title)?.criterionKey), evidenceReferences: concern.evidence.map((item) => `${item.sourceType} · ${item.excerpt}`), generationReason: `Screening identified limited or uncertain evidence in ${concern.title}.`, interviewerGuidance: 'Treat the screening result as a prompt to verify, not a conclusion.', expectedEvidence: 'A specific example, the candidate’s approach, and lessons learned.' }))

  add(base({ text: `Tell us about a time requirements changed late in a ${input.job.title} project. How did you respond and keep others aligned?`, category: 'BEHAVIORAL', priority: 'FOLLOW_UP', estimatedMinutes: 4, criterionKeys: criteria(criterionFor(/communication|collaboration|team|stakeholder/i)), generationReason: 'Explore collaboration, adaptability, and responsibility in role context.', interviewerGuidance: 'Listen for communication, ownership, and reflection.', expectedEvidence: 'A specific situation, actions taken, outcome, and learning.' }))
  if (input.durationMinutes >= 60) add(base({ text: 'Tell us about a time you disagreed with an important professional decision. How did you communicate your view, and what happened?', category: 'BEHAVIORAL', priority: 'FOLLOW_UP', estimatedMinutes: 4, criterionKeys: criteria(criterionFor(/communication|collaboration/i)), generationReason: 'Assess constructive disagreement and professional communication.', interviewerGuidance: 'Listen for respect, clarity, and ability to revise a position.', expectedEvidence: 'Context, communication approach, resolution, and reflection.' }))

  if (input.durationMinutes >= 45) {
    const designRole = /design|ux|ui/i.test(`${input.job.title} ${input.job.description}`)
    add(base({ text: designRole ? 'Imagine user feedback conflicts with a key product constraint. How would you investigate the problem and decide what to change?' : `Imagine a critical ${input.job.title} deliverable begins failing as usage grows. How would you investigate the issue and decide what to improve first?`, category: 'PROBLEM_SOLVING', priority: 'CORE', estimatedMinutes: 5, criterionKeys: criteria(criterionFor(/problem|reasoning|judgment|decision/i)), generationReason: 'Explore a role-relevant approach to ambiguity, trade-offs, and prioritization.', interviewerGuidance: 'Look for structured diagnosis, assumptions, trade-offs, and validation.', expectedEvidence: 'A clear investigation sequence, prioritization logic, and validation plan.' }))
  }

  input.requirements.filter((item) => item.type === 'PREFERRED_SKILL').forEach((requirement) => {
    if (!includesEvidence(input, requirement.skillName ?? requirement.label)) add(base({ text: `${requirement.label} is helpful for this role. What exposure have you had to it, and where would you need support to become effective?`, category: 'MISSING_EVIDENCE', priority: 'OPTIONAL', estimatedMinutes: 3, requirementIds: [requirement.id], generationReason: `No direct evidence was submitted for the preferred qualification ${requirement.label}.`, interviewerGuidance: 'Use only if time permits; preferred experience is not a required qualification.', expectedEvidence: 'Relevant exposure, transferable experience, and a realistic learning approach.' }))
  })

  add(base({ text: `What questions do you have for us about the ${input.job.title} role, the team, or how success will be measured?`, category: 'CANDIDATE_QUESTION', priority: 'CORE', estimatedMinutes: 3, generationReason: 'Reserve time for the candidate to evaluate the role and clarify expectations.', expectedEvidence: 'Candidate questions and any role expectations that need clarification.' }))

  const requiredIds = new Set(input.requirements.filter((item) => item.importance === 'REQUIRED').map((item) => item.id))
  const essential = drafts.filter((item) => item.requirementIds.some((id) => requiredIds.has(id)) || item.category === 'INTRODUCTION' || item.category === 'CANDIDATE_QUESTION')
  const remainder = drafts.filter((item) => !essential.includes(item))
  const selected = [...essential, ...remainder].slice(0, budget.maximum)
  while (selected.length < budget.minimum) {
    const index = selected.length + 1
    selected.splice(Math.max(1, selected.length - 1), 0, base({ text: `Describe a recent ${input.job.title} decision where you had to balance quality, time, and stakeholder needs. What did you choose and why? Focus on example ${index}.`, category: 'EXPERIENCE', priority: 'FOLLOW_UP', estimatedMinutes: 3, generationReason: `Provide sufficient role-specific depth for a ${input.durationMinutes}-minute interview.`, interviewerGuidance: 'Listen for explicit trade-offs and ownership.', expectedEvidence: 'Context, options considered, decision, and outcome.' }))
  }
  let total = selected.reduce((sum, item) => sum + item.estimatedMinutes, 0)
  for (let index = selected.length - 1; total > budget.usableMinutes && index >= 0; index -= 1) {
    const reducible = Math.max(0, selected[index].estimatedMinutes - 2)
    const reduction = Math.min(reducible, total - budget.usableMinutes)
    selected[index] = { ...selected[index], estimatedMinutes: selected[index].estimatedMinutes - reduction }
    total -= reduction
  }
  const questions = selected.map((question, index) => ({ ...question, id: `question-${input.interview.id}-${String(index + 1).padStart(3, '0')}`, order: index + 1 }))
  return { questions, summary: `${questions.length} candidate-specific questions prepared for a ${input.durationMinutes}-minute interview, using ${requiredSkills.length} required skill${requiredSkills.length === 1 ? '' : 's'} and available screening evidence.`, warnings }
}

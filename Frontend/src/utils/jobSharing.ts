import type { Job } from '../types/job'

const formatEmploymentType = (value: Job['employmentType']) => ({
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  TEMPORARY: 'Temporary',
})[value]

const formatWorkArrangement = (value: Job['workArrangement']) => ({
  ONSITE: 'On-site',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
})[value]

const formatDeadline = (value?: string) => value
  ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
  : undefined

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
})[character]!)

export function buildPublicApplicationUrl(jobId: string, origin: string) {
  return `${origin.replace(/\/$/, '')}/apply/${encodeURIComponent(jobId)}`
}

export function buildShareableJobPost(job: Job, applicationUrl: string) {
  const responsibilities = job.description
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)

  const requiredSkills = job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED')
  const preferredSkills = job.requiredSkills.filter((skill) => skill.priority === 'PREFERRED')
  const deadline = formatDeadline(job.applicationDeadline)
  const workplace = [formatWorkArrangement(job.workArrangement), job.location].filter(Boolean).join(', ')

  const sections = [
    'Job Position',
    job.title,
    '',
    'Job Description',
  ]

  sections.push(...responsibilities.map((item) => `- ${item}`))

  sections.push('', 'Job Requirements')
  sections.push(...requiredSkills.map((skill) => `- ${skill.name}`))
  sections.push(`- Minimum ${job.minimumExperienceYears} year${job.minimumExperienceYears === 1 ? '' : 's'} of relevant experience`)
  sections.push(`- ${formatEmploymentType(job.employmentType)}`)
  sections.push(`- ${workplace}`)

  if (preferredSkills.length) {
    sections.push(...preferredSkills.map((skill) => `- ${skill.name} preferred`))
  }

  if (deadline) sections.push(`- Application deadline: ${deadline}`)

  sections.push(
    '',
    'Contact',
    'Email: [Recruitment email]',
    'Phone: [Recruitment phone]',
    '',
    'Application Form',
    applicationUrl,
  )

  return sections.join('\n')
}

export function buildShareableJobHtml(job: Job, applicationUrl: string) {
  const responsibilities = job.description
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
  const requiredSkills = job.requiredSkills.filter((skill) => skill.priority === 'REQUIRED')
  const preferredSkills = job.requiredSkills.filter((skill) => skill.priority === 'PREFERRED')
  const deadline = formatDeadline(job.applicationDeadline)
  const workplace = [formatWorkArrangement(job.workArrangement), job.location].filter(Boolean).join(', ')
  const requirements = [
    ...requiredSkills.map((skill) => skill.name),
    `Minimum ${job.minimumExperienceYears} year${job.minimumExperienceYears === 1 ? '' : 's'} of relevant experience`,
    formatEmploymentType(job.employmentType),
    workplace,
    ...preferredSkills.map((skill) => `${skill.name} preferred`),
    ...(deadline ? [`Application deadline: ${deadline}`] : []),
  ]

  return [
    '<p><strong>Job Position</strong></p>',
    `<p><strong>${escapeHtml(job.title)}</strong></p>`,
    '<p><br></p>',
    '<p><strong>Job Description</strong></p>',
    `<ul>${responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`,
    '<p><br></p>',
    '<p><strong>Job Requirements</strong></p>',
    `<ul>${requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`,
    '<p><br></p>',
    '<p><strong>Contact</strong></p>',
    '<p>Email: [Recruitment email]<br>Phone: [Recruitment phone]</p>',
    '<p><br></p>',
    '<p><strong>Application Form</strong></p>',
    `<p><a href="${escapeHtml(applicationUrl)}">${escapeHtml(applicationUrl)}</a></p>`,
  ].join('')
}

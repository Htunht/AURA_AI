import type { ApplicationFormField } from '../types/applicationForm'

export type UrlFieldValidationResult = {
  valid: boolean
  value: string
  error?: string
}

const githubPathPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/

export function normalizeGenericHttpsUrl(rawValue: string): UrlFieldValidationResult {
  const value = rawValue.trim()

  if (!value) {
    return { valid: true, value: '' }
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return { valid: false, value, error: 'Enter a valid HTTPS URL.' }
  }

  const hostname = parsed.hostname.toLowerCase()
  if (parsed.protocol !== 'https:') {
    return { valid: false, value, error: 'URL must start with https://.' }
  }

  if (hostname === 'localhost' || hostname.endsWith('.localhost') || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1') {
    return { valid: false, value, error: 'Localhost URLs are not accepted.' }
  }

  parsed.hash = ''
  return { valid: true, value: parsed.toString() }
}

export function normalizeGitHubRepositoryUrl(rawValue: string): UrlFieldValidationResult {
  const generic = normalizeGenericHttpsUrl(rawValue)
  if (!generic.valid || !generic.value) return generic

  const parsed = new URL(generic.value)
  const hostname = parsed.hostname.toLowerCase()
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    return { valid: false, value: rawValue.trim(), error: 'Enter a public GitHub repository URL.' }
  }

  if (parsed.search || parsed.hash) {
    return { valid: false, value: rawValue.trim(), error: 'GitHub repository URL must not include query parameters or fragments.' }
  }

  const path = parsed.pathname.replace(/^\/|\/$/g, '')
  if (!githubPathPattern.test(path)) {
    return { valid: false, value: rawValue.trim(), error: 'Enter a GitHub URL in the format https://github.com/owner/repository.' }
  }

  const [owner, repositoryWithSuffix] = path.split('/')
  const repository = repositoryWithSuffix?.endsWith('.git')
    ? repositoryWithSuffix.slice(0, -4)
    : repositoryWithSuffix

  if (!owner || !repository || owner === '..' || repository === '..') {
    return { valid: false, value: rawValue.trim(), error: 'Enter a valid GitHub owner and repository.' }
  }

  return { valid: true, value: `https://github.com/${owner}/${repository}` }
}

export function normalizeUrlFieldValue(
  field: Pick<ApplicationFormField, 'key' | 'type'>,
  rawValue: string,
): UrlFieldValidationResult {
  if (field.type !== 'URL') return { valid: true, value: rawValue }
  return field.key === 'github_repository_url'
    ? normalizeGitHubRepositoryUrl(rawValue)
    : normalizeGenericHttpsUrl(rawValue)
}


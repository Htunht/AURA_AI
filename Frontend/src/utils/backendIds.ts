const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isBackendUuid(value: string) {
  return uuidPattern.test(value)
}

export function isDemoId(value: string) {
  return /^(candidate|application|job)-demo-|^job-\d+/i.test(value)
}


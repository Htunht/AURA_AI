export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

const accessTokenKey = 'aura-backend-access-token'

export function getBackendAccessToken() {
  return sessionStorage.getItem(accessTokenKey)
}

export function setBackendAccessToken(token: string) {
  sessionStorage.setItem(accessTokenKey, token)
}

export function clearBackendAccessToken() {
  sessionStorage.removeItem(accessTokenKey)
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  const token = getBackendAccessToken()
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    const body = await response.json().catch(() => undefined)
    const message = typeof body?.detail === 'string' ? body.detail : 'Request failed.'
    throw new ApiError(message, response.status, body)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

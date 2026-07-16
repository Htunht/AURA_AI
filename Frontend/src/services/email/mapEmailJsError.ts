import type { EmailDeliveryErrorCode } from '../../types/emailDelivery'
export function mapEmailJsError(error: unknown): { errorCode: EmailDeliveryErrorCode; errorMessage: string } {
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : undefined
  return status === 400 || status === 403
    ? { errorCode: 'PROVIDER_REJECTED', errorMessage: 'The email provider rejected the request.' }
    : { errorCode: 'PROVIDER_REQUEST_FAILED', errorMessage: 'The scheduling invitation email could not be sent.' }
}

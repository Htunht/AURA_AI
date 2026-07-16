export type EmailProviderMode = 'emailjs' | 'disabled'
export type EmailConfig = {
  provider: EmailProviderMode
  appPublicUrl: string
  emailJs?: { publicKey: string; serviceId: string; schedulingTemplateId: string }
}

export function getEmailConfig(): EmailConfig {
  const rawProvider = String(import.meta.env.VITE_EMAIL_PROVIDER ?? 'disabled').trim().toLowerCase()
  const provider: EmailProviderMode = rawProvider === 'emailjs' ? 'emailjs' : 'disabled'
  const fallbackUrl = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin
  const rawUrl = String(import.meta.env.VITE_APP_PUBLIC_URL ?? fallbackUrl).trim()
  const appPublicUrl = (() => { try { return new URL(rawUrl).origin } catch { return fallbackUrl } })()
  const publicKey = String(import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '').trim()
  const serviceId = String(import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '').trim()
  const schedulingTemplateId = String(import.meta.env.VITE_EMAILJS_SCHEDULING_TEMPLATE_ID ?? '').trim()
  return {
    provider,
    appPublicUrl,
    emailJs: provider === 'emailjs' && publicKey && serviceId && schedulingTemplateId
      ? { publicKey, serviceId, schedulingTemplateId }
      : undefined,
  }
}

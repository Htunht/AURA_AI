import type { ReactNode } from 'react'

type BadgeProps = {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'
}

const toneClasses = {
  neutral: 'bg-frost text-harbor',
  success: 'bg-aura-success-soft text-aura-success',
  warning: 'bg-aura-warning-soft text-aura-warning',
  danger: 'bg-aura-danger-soft text-aura-danger',
  accent: 'bg-glacier/20 text-harbor',
} satisfies Record<NonNullable<BadgeProps['tone']>, string>

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`badge inline-flex w-max items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

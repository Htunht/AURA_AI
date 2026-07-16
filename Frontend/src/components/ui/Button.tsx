import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

const variantClasses = {
  primary:
    'border-[#72a3bf] bg-[#72a3bf] text-[#1D4052] hover:bg-[#628ea8] focus-visible:ring-[#72a3bf] shadow-[0_0_10px_rgba(114,163,191,0.5)]',
  secondary:
    'border-[#72a3bf] bg-transparent text-[#72a3bf] hover:bg-[#72a3bf]/10 focus-visible:ring-[#72a3bf] shadow-[0_0_10px_rgba(114,163,191,0.2)]',
  danger:
    'border-aura-danger bg-aura-danger text-white hover:brightness-90 focus-visible:ring-aura-danger/30 shadow-[0_0_10px_rgba(var(--color-aura-danger),0.5)]',
  ghost:
    'border-transparent bg-transparent text-[#72a3bf] hover:bg-[#72a3bf]/10 focus-visible:ring-[#72a3bf]',
} satisfies Record<NonNullable<ButtonProps['variant']>, string>

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'button inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border px-4 text-sm font-semibold leading-none no-underline transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}

import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

const variantClasses = {
  primary:
    'border-harbor bg-harbor text-frost hover:border-depth hover:bg-depth focus-visible:ring-glacier',
  secondary:
    'border-marine/35 bg-white text-harbor hover:bg-glacier/15 focus-visible:ring-glacier',
  danger:
    'border-aura-danger bg-aura-danger text-white hover:brightness-90 focus-visible:ring-aura-danger/30',
  ghost:
    'border-transparent bg-transparent text-harbor hover:bg-glacier/20 focus-visible:ring-glacier',
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
        'button inline-flex h-10 items-center justify-center gap-2 rounded-aura-sm border px-4 text-sm font-semibold leading-none no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}

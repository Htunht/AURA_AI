import { forwardRef, type ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

const variantClasses = {
  primary:
    'border-[#C7FF38] bg-[#C7FF38] text-[#1E2022] hover:bg-[#a6db2c] hover:shadow-[0_0_14px_rgba(199,255,56,0.65)] focus-visible:ring-[#C7FF38] shadow-[0_0_10px_rgba(199,255,56,0.45)]',
  secondary:
    'border-[#1E2022]/30 bg-transparent text-[#1E2022]/85 hover:border-[#1E2022] hover:text-[#1E2022] hover:bg-[#1E2022]/5 focus-visible:ring-[#1E2022]/30 transition-all duration-150',
  danger:
    'border-aura-danger bg-aura-danger text-white hover:brightness-90 focus-visible:ring-aura-danger/30 shadow-[0_0_10px_rgba(var(--color-aura-danger),0.5)]',
  ghost:
    'border-transparent bg-transparent text-[#1E2022]/85 hover:text-[#1E2022] hover:bg-[#1E2022]/5 focus-visible:ring-[#1E2022]/30',
} satisfies Record<NonNullable<ButtonProps['variant']>, string>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps, ref) {
  return (
    <button
      ref={ref}
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
})

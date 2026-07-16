import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`input w-full rounded-aura-sm border border-harbor/20 bg-white px-3 py-2.5 text-sm text-depth shadow-aura-xs placeholder:text-harbor/45 focus:border-marine focus:outline-none focus:ring-2 focus:ring-glacier/35 disabled:bg-frost disabled:text-harbor/50 file:mr-3 file:rounded-aura-xs file:border-0 file:bg-frost file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-harbor ${className}`.trim()}
      {...props}
    />
  )
}

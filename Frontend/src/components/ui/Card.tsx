import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement>

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`card rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}


import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`card rounded-aura-md border border-harbor/15 bg-white shadow-aura-xs ${className}`.trim()}
    >
      {children}
    </div>
  )
}

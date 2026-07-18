import type { ReactNode } from 'react'

type PageContainerProps = {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  hideHeader?: boolean
  children: ReactNode
}

export function PageContainer({
  title,
  eyebrow = 'Recruitment operations',
  description,
  actions,
  hideHeader = false,
  children,
}: PageContainerProps) {
  return (
    <section className="mx-auto w-full">
      {!hideHeader ? <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-marine">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-[-0.02em] text-depth md:text-[28px] xl:text-[32px]">
            {title}
          </h1>
          {description ? (
            <p className="mb-0 max-w-3xl text-sm leading-6 text-aura-text-secondary md:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center justify-start gap-[9px] sm:w-auto sm:justify-end [&_.button]:max-sm:w-full">
            {actions}
          </div>
        ) : null}
      </header> : null}
      {children}
    </section>
  )
}

import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'

type DialogProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'default' | 'wide'
}

export function Dialog({ open, title, children, onClose, size = 'default' }: DialogProps) {
  const titleId = useId()

  if (!open) {
    return null
  }

  return (
    <div
      className="dialog-overlay fixed inset-0 z-50 grid place-items-center bg-depth/55 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className={`dialog flex max-h-[92vh] flex-col overflow-hidden rounded-aura-lg border border-harbor/20 bg-white shadow-aura-lg ${size === 'wide' ? 'w-[min(96vw,78rem)]' : 'w-[min(92vw,42rem)]'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog__header flex items-center justify-between gap-5 border-b border-harbor/15 bg-white px-5 py-4">
          <h2 id={titleId} className="m-0 text-lg font-semibold text-depth">
            {title}
          </h2>
          <button
            type="button"
            className="icon-button inline-grid size-9 place-items-center rounded-aura-sm border border-harbor/15 bg-white text-harbor transition-colors duration-150 hover:bg-glacier/15 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="dialog__body overflow-auto p-5 md:p-6">{children}</div>
      </section>
    </div>
  )
}

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'

type DialogProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  size?: 'default' | 'wide'
  initialFocusRef?: RefObject<HTMLElement | null>
  returnFocusRef?: RefObject<HTMLElement | null>
}

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({ open, title, description, children, onClose, size = 'default', initialFocusRef, returnFocusRef }: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const returnFocus = returnFocusRef?.current ?? previouslyFocused
    const dialog = dialogRef.current
    const focusable = () => dialog ? Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)) : []
    const frame = window.requestAnimationFrame(() => (initialFocusRef?.current ?? focusable()[0])?.focus())

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) return
      const first = elements[0]!
      const last = elements[elements.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      window.requestAnimationFrame(() => {
        const active = document.activeElement
        if (!(active instanceof HTMLElement) || active === document.body || !active.isConnected) returnFocus?.focus()
      })
    }
  }, [initialFocusRef, open, returnFocusRef])

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
        ref={dialogRef}
        className={`dialog flex max-h-[92vh] flex-col overflow-hidden rounded-aura-lg border border-harbor/20 bg-white shadow-aura-lg ${size === 'wide' ? 'w-[min(96vw,78rem)]' : 'w-[min(92vw,42rem)]'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dialog__header flex items-center justify-between gap-5 border-b border-harbor/15 bg-white px-5 py-4">
          <div>
            <h2 id={titleId} className="m-0 text-lg font-semibold text-depth">{title}</h2>
            {description ? <p id={descriptionId} className="mb-0 mt-1 text-sm text-aura-text-secondary">{description}</p> : null}
          </div>
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

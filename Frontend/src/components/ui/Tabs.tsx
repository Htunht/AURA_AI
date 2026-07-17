export type TabItem = {
  id: string
  label: string
  disabled?: boolean
  availabilityText?: string
}

type TabsProps = {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  ariaLabel?: string
  compact?: boolean
}

export function Tabs({
  items,
  activeId,
  onChange,
  ariaLabel = 'Application form views',
  compact = false,
}: TabsProps) {
  return (
    <div
      className={`tabs mb-3 flex gap-1 overflow-x-auto border-b border-harbor/15 ${compact ? 'mt-1' : 'mt-6'}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          aria-disabled={item.disabled || undefined}
          title={item.disabled ? item.availabilityText : undefined}
          className={`tabs__button min-h-10 whitespace-nowrap border-0 border-b-2 border-solid px-3 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier focus-visible:ring-offset-2 ${
            activeId === item.id
              ? 'border-marine bg-white text-depth'
              : item.disabled
                ? 'cursor-not-allowed border-transparent bg-transparent text-harbor/35'
                : 'border-transparent bg-transparent text-harbor/65 hover:bg-white/55 hover:text-harbor'
          }`}
          onClick={() => { if (!item.disabled) onChange(item.id) }}
        >
          <span>{item.label}</span>
          {item.disabled && item.availabilityText ? <span className="sr-only">. {item.availabilityText}</span> : null}
        </button>
      ))}
    </div>
  )
}

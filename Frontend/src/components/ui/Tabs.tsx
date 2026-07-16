export type TabItem = {
  id: string
  label: string
}

type TabsProps = {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
}

export function Tabs({ items, activeId, onChange }: TabsProps) {
  return (
    <div
      className="tabs mt-6 mb-4 flex gap-1 border-b border-harbor/15"
      role="tablist"
      aria-label="Application form views"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          className={`tabs__button border-0 border-b-2 border-solid bg-transparent px-3 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glacier focus-visible:ring-offset-2 ${
            activeId === item.id
              ? 'border-marine text-depth'
              : 'border-transparent text-harbor/60 hover:text-harbor'
          }`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

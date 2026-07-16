export function SkeletonPage() {
  return (
    <div className="w-full animate-pulse" aria-hidden="true">
      {/* Header section skeleton */}
      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="w-full max-w-lg">
          {/* Eyebrow */}
          <div className="mb-2 h-3.5 w-24 rounded bg-harbor/15"></div>
          {/* Title */}
          <div className="mb-3 h-8 w-64 rounded bg-harbor/20 md:h-10"></div>
          {/* Description */}
          <div className="h-4 w-full rounded bg-harbor/10"></div>
        </div>
        {/* Actions button */}
        <div className="h-10 w-32 rounded bg-harbor/15 max-sm:w-full"></div>
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-aura-md border border-harbor/10 bg-white p-5 shadow-aura-sm">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="h-3 w-28 rounded bg-harbor/10"></div>
              <div className="size-9 rounded-aura-sm bg-harbor/15"></div>
            </div>
            <div className="h-9 w-16 rounded bg-harbor/25"></div>
            <div className="mt-3.5 h-3 w-40 rounded bg-harbor/10"></div>
          </div>
        ))}
      </div>

      {/* Content list skeleton */}
      <div className="mt-4 rounded-aura-md border border-harbor/15 bg-white p-5 shadow-aura-sm">
        <div className="mb-4 h-6 w-48 rounded bg-harbor/20"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="h-4.5 w-44 rounded bg-harbor/20"></div>
                <div className="h-3.5 w-60 rounded bg-harbor/10"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 rounded bg-harbor/15"></div>
                <div className="h-9 w-28 rounded bg-harbor/15"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

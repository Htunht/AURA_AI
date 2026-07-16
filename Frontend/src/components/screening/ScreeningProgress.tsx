import { ScanSearch } from 'lucide-react'
import { Card } from '../ui/Card'

type ScreeningProgressProps = {
  message: string
}

export function ScreeningProgress({ message }: ScreeningProgressProps) {
  return (
    <Card className="overflow-hidden" >
      <div className="grid min-h-72 place-items-center p-8 text-center" aria-live="polite" aria-busy="true">
        <div>
          <span className="relative mx-auto mb-5 inline-grid size-14 place-items-center rounded-full border border-marine/20 bg-glacier/15 text-marine">
            <span className="absolute inset-[-7px] animate-pulse rounded-full border border-glacier/35 motion-reduce:animate-none" aria-hidden="true" />
            <ScanSearch size={24} aria-hidden="true" />
          </span>
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.15em] text-marine">AI-assisted screening</p>
          <h2 className="mb-0 mt-2 text-xl font-semibold text-depth">Reviewing application evidence</h2>
          <p className="mb-0 mt-3 text-sm text-aura-text-secondary">{message}</p>
          <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-harbor/10">
            <span className="block h-full w-2/3 animate-pulse rounded-full bg-marine motion-reduce:animate-none" />
          </div>
          <p className="mx-auto mb-0 mt-5 max-w-md text-xs leading-5 text-aura-text-muted">AURA provides an advisory recommendation. A recruiter must review the result before the application moves forward.</p>
        </div>
      </div>
    </Card>
  )
}

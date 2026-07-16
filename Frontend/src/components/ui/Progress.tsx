type ProgressProps = {
  value: number
}

export function Progress({ value }: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div
      className="progress h-2 overflow-hidden rounded-full bg-harbor/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
    >
      <span
        className="progress__bar block h-full bg-marine"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  )
}

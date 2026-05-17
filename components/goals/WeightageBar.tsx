'use client'

import { cn } from '@/lib/utils'

interface WeightageBarProps {
  total: number
  className?: string
}

export function WeightageBar({ total, className }: WeightageBarProps) {
  const clamped = Math.min(total, 100)
  const over = total > 100
  const exact = Math.abs(total - 100) <= 0.01
  const under = total < 100

  const barColor = exact
    ? 'bg-[linear-gradient(90deg,#10b981,#34d399)]'
    : over
      ? 'bg-[linear-gradient(90deg,#ef4444,#fb7185)]'
      : 'bg-[image:var(--accent-gradient)]'

  const textColor = exact
    ? 'text-emerald-300'
    : over
      ? 'text-red-300'
      : 'text-slate-300'

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="uppercase tracking-[0.08em] text-slate-500">Total Weightage</span>
        <span className={cn('metric-number', textColor)}>
          {total.toFixed(1)}% / 100%
          {exact && ' Ready'}
          {over && ' Over limit'}
          {under && total > 0 && ` ${(100 - total).toFixed(1)}% remaining`}
        </span>
      </div>

      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out', barColor)}
          style={{ width: `${clamped}%` }}
        />
        <div className="absolute inset-y-0 right-0 w-px bg-white/15" />
      </div>

      <div className="relative h-1">
        {[25, 50, 75].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 h-1 w-px bg-white/10"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>
    </div>
  )
}

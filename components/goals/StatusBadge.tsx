import { cn } from '@/lib/utils'
import type { GoalStatus } from '@prisma/client'

const STATUS_CONFIG: Record<GoalStatus, { label: string; classes: string; dot: string }> = {
  DRAFT: {
    label: 'Draft',
    classes: 'border-slate-500/20 bg-slate-500/12 text-slate-300',
    dot: 'bg-slate-400',
  },
  SUBMITTED: {
    label: 'Submitted',
    classes: 'border-blue-500/25 bg-blue-500/15 text-blue-300',
    dot: 'bg-blue-400',
  },
  APPROVED: {
    label: 'Approved',
    classes: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  RETURNED: {
    label: 'Returned',
    classes: 'border-amber-500/25 bg-amber-500/15 text-amber-300',
    dot: 'bg-amber-400',
  },
  LOCKED: {
    label: 'Locked',
    classes: 'border-violet-500/25 bg-violet-500/15 text-violet-300',
    dot: 'bg-violet-400',
  },
}

interface StatusBadgeProps {
  status: GoalStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        config.classes,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}

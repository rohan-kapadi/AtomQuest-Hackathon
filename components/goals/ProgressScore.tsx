'use client'

import { displayScore, getScoreColor, COLOR_MAP } from '@/lib/score-calculator'

interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showBar?: boolean
  label?: string
}

export function ProgressScore({ score, size = 'md', showBar = false, label }: Props) {
  const tier = getScoreColor(score)
  const colors = COLOR_MAP[tier]
  const pct = Math.min(score * 100, 150)

  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl font-bold' : 'text-sm font-semibold'

  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs text-gray-500">{label}</p>}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${colors.bg} ${colors.border}`}>
        <span className={`${textSize} ${colors.text}`}>{displayScore(score)}</span>
        {size !== 'sm' && (
          <span className="text-xs text-gray-600">
            {tier === 'green' ? '✓ On Track' : tier === 'yellow' ? '⚠ Below Target' : '✗ At Risk'}
          </span>
        )}
      </div>
      {showBar && (
        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

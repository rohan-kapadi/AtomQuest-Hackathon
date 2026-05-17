// lib/score-calculator.ts
// Section 6.4 — Progress Score Formulas

export function calculateScore(
  uomType: string,
  target: number | null,
  targetDate: Date | string | null,
  actualValue: number | null | undefined,
  actualDate: Date | string | null | undefined,
  isZeroAchieved: boolean | null | undefined
): number {
  switch (uomType) {
    case 'NUMERIC_MIN':
      if (!target || actualValue == null || actualValue <= 0) return 0
      return actualValue / target

    case 'NUMERIC_MAX':
      if (!target || !actualValue || actualValue <= 0) return 0
      return target / actualValue

    case 'TIMELINE': {
      if (!targetDate || !actualDate) return 0
      const deadline = new Date(targetDate).getTime()
      const completion = new Date(actualDate).getTime()
      const daysEarly = (deadline - completion) / (1000 * 60 * 60 * 24)
      if (daysEarly >= 0) return 1.0 + daysEarly / 365
      return completion === 0 ? 0 : deadline / completion
    }

    case 'ZERO':
      return isZeroAchieved ? 1.0 : 0.0

    default:
      return 0
  }
}

/** Display score as a percentage, capped at 150% for display */
export function displayScore(score: number): string {
  return `${Math.min(score * 100, 150).toFixed(1)}%`
}

/** Color tier: 0–69% = red, 70–89% = yellow, 90%+ = green */
export function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 0.9) return 'green'
  if (score >= 0.7) return 'yellow'
  return 'red'
}

export const COLOR_MAP = {
  green:  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  yellow: { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-400',   bar: 'bg-amber-500'  },
  red:    { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-400',     bar: 'bg-red-500'    },
} as const

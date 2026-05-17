'use client'

import { useState, useMemo } from 'react'
import { Loader2, Save, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { calculateScore, displayScore, getScoreColor, COLOR_MAP } from '@/lib/score-calculator'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
type AchievementStatus = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED'

interface Achievement {
  quarter: Quarter
  status: AchievementStatus
  actualValue: number | null
  actualDate: string | null
  isZeroAchieved: boolean | null
  notes: string | null
  progressScore: number | null
}

interface Goal {
  id: string
  title: string
  thrustArea: string
  uomType: string
  target: number | null
  targetDate: string | null
  weightage: number
  isReadOnly: boolean
}

interface Props {
  goal: Goal
  existingAchievements: Achievement[]
}

const QUARTERS: { key: Quarter; label: string; window: string }[] = [
  { key: 'Q1', label: 'Q1', window: 'July' },
  { key: 'Q2', label: 'Q2', window: 'October' },
  { key: 'Q3', label: 'Q3', window: 'January' },
  { key: 'Q4', label: 'Q4', window: 'Mar / Apr' },
]

const STATUS_OPTIONS: { value: AchievementStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'ON_TRACK',    label: 'On Track'    },
  { value: 'COMPLETED',   label: 'Completed'   },
]

const INPUT = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors'

export function CheckinForm({ goal, existingAchievements }: Props) {
  const byQuarter = useMemo(
    () => Object.fromEntries(existingAchievements.map(a => [a.quarter, a])),
    [existingAchievements]
  ) as Partial<Record<Quarter, Achievement>>

  const [activeQ, setActiveQ] = useState<Quarter>('Q1')
  const existing = byQuarter[activeQ]

  const [actualValue, setActualValue]       = useState(existing?.actualValue?.toString() ?? '')
  const [actualDate, setActualDate]         = useState(existing?.actualDate ? new Date(existing.actualDate).toISOString().split('T')[0] : '')
  const [isZeroAchieved, setIsZeroAchieved] = useState<boolean>(existing?.isZeroAchieved ?? false)
  const [status, setStatus]                 = useState<AchievementStatus>(existing?.status ?? 'NOT_STARTED')
  const [notes, setNotes]                   = useState(existing?.notes ?? '')

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  // Switch quarter — load existing data or blank
  function switchQuarter(q: Quarter) {
    setActiveQ(q)
    const a = byQuarter[q]
    setActualValue(a?.actualValue?.toString() ?? '')
    setActualDate(a?.actualDate ? new Date(a.actualDate).toISOString().split('T')[0] : '')
    setIsZeroAchieved(a?.isZeroAchieved ?? false)
    setStatus(a?.status ?? 'NOT_STARTED')
    setNotes(a?.notes ?? '')
    setError('')
    setSuccess('')
  }

  // Live score preview
  const liveScore = useMemo(() => {
    return calculateScore(
      goal.uomType,
      goal.target,
      goal.targetDate,
      actualValue ? parseFloat(actualValue) : null,
      actualDate || null,
      isZeroAchieved
    )
  }, [goal, actualValue, actualDate, isZeroAchieved])

  const scoreColor = getScoreColor(liveScore)
  const colors = COLOR_MAP[scoreColor]

  async function handleSave() {
    setError('')
    setSuccess('')

    const payload: Record<string, unknown> = {
      quarter: activeQ,
      status,
      notes: notes || null,
    }

    if (goal.uomType === 'NUMERIC_MIN' || goal.uomType === 'NUMERIC_MAX') {
      if (!actualValue) { setError('Please enter the actual value.'); return }
      payload.actualValue = parseFloat(actualValue)
    } else if (goal.uomType === 'TIMELINE') {
      if (!actualDate) { setError('Please enter the actual completion date.'); return }
      payload.actualDate = actualDate
    } else if (goal.uomType === 'ZERO') {
      payload.isZeroAchieved = isZeroAchieved
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/goals/${goal.id}/achievements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to save.'); return }
      setSuccess(`✓ ${activeQ} achievement saved — Score: ${json.progressScore}`)
      // Update local cache
      byQuarter[activeQ] = { ...payload, progressScore: liveScore } as Achievement
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Quarter tabs */}
      <div className="flex gap-2 flex-wrap">
        {QUARTERS.map(q => {
          const hasData = !!byQuarter[q.key]
          const isActive = activeQ === q.key
          return (
            <button
              key={q.key}
              onClick={() => switchQuarter(q.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                isActive
                  ? 'bg-violet-600 border-violet-500 text-white'
                  : hasData
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {q.label}
              {hasData && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              <span className="text-gray-500">{q.window}</span>
            </button>
          )
        })}
      </div>

      {/* Input fields based on UoM */}
      <div className="space-y-3">
        {(goal.uomType === 'NUMERIC_MIN' || goal.uomType === 'NUMERIC_MAX') && (
          <div>
            <label className="text-xs text-gray-400 font-medium">
              Actual Value
              {goal.target && (
                <span className="ml-2 text-gray-600">Target: {goal.target.toLocaleString()}</span>
              )}
            </label>
            <input
              type="number" step="any" value={actualValue}
              onChange={e => setActualValue(e.target.value)}
              placeholder={goal.uomType === 'NUMERIC_MIN' ? 'Enter actual achieved value' : 'Enter actual value (lower is better)'}
              className={`${INPUT} mt-1`}
            />
            <p className="text-xs text-gray-600 mt-1">
              {goal.uomType === 'NUMERIC_MIN' ? 'Score = actual ÷ target' : 'Score = target ÷ actual'}
            </p>
          </div>
        )}

        {goal.uomType === 'TIMELINE' && (
          <div>
            <label className="text-xs text-gray-400 font-medium">
              Actual Completion Date
              {goal.targetDate && (
                <span className="ml-2 text-gray-600">
                  Target: {new Date(goal.targetDate).toLocaleDateString('en-IN')}
                </span>
              )}
            </label>
            <input
              type="date" value={actualDate}
              onChange={e => setActualDate(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </div>
        )}

        {goal.uomType === 'ZERO' && (
          <div className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-xl">
            <input
              type="checkbox" id={`zero-${goal.id}`} checked={isZeroAchieved}
              onChange={e => setIsZeroAchieved(e.target.checked)}
              className="w-4 h-4 accent-violet-500"
            />
            <label htmlFor={`zero-${goal.id}`} className="text-sm text-gray-300">
              Zero incidents achieved this quarter
            </label>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="text-xs text-gray-400 font-medium">Status</label>
          <select
            value={status} onChange={e => setStatus(e.target.value as AchievementStatus)}
            className={`${INPUT} mt-1 h-9`}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-400 font-medium">Notes <span className="text-gray-600">(optional)</span></label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Key highlights, blockers, context..."
            rows={2} className={`${INPUT} mt-1 resize-none`}
          />
        </div>
      </div>

      {/* Live score preview */}
      {(actualValue || actualDate || goal.uomType === 'ZERO') && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${colors.bg} ${colors.border}`}>
          <TrendingUp className={`w-4 h-4 ${colors.text}`} />
          <div>
            <p className="text-xs text-gray-500">Live Score Preview</p>
            <p className={`text-lg font-bold ${colors.text}`}>{displayScore(liveScore)}</p>
          </div>
        </div>
      )}

      {error && (
        <Alert className="bg-red-500/10 border-red-500/30 text-red-300 py-2">
          <AlertCircle className="h-3.5 w-3.5" /><AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 py-2">
          <CheckCircle2 className="h-3.5 w-3.5" /><AlertDescription className="text-xs">{success}</AlertDescription>
        </Alert>
      )}

      <button
        onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-violet-500/20 disabled:opacity-50"
      >
        {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Save className="w-3.5 h-3.5" /> Save {activeQ} Achievement</>}
      </button>
    </div>
  )
}

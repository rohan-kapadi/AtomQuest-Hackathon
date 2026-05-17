'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, RotateCcw, Loader2, AlertCircle, Save } from 'lucide-react'
import { WeightageBar } from '@/components/goals/WeightageBar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Goal, UoMType } from '@prisma/client'

interface InlineGoal extends Goal {
  _editing?: boolean
}

interface ApprovalActionsProps {
  sheetId: string
  initialGoals: Goal[]
  initialTotal: number
  employeeName: string
}

export function ApprovalActions({
  sheetId,
  initialGoals,
  initialTotal,
  employeeName,
}: ApprovalActionsProps) {
  const router = useRouter()
  const [goals, setGoals] = useState<InlineGoal[]>(initialGoals)
  const [returnComment, setReturnComment] = useState('')
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [returning, setReturning] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)

  const totalWeightage = goals.reduce((sum, g) => sum + (Number(g.weightage) || 0), 0)
  const isExact100 = Math.abs(totalWeightage - 100) <= 0.01

  function updateGoalField(goalId: string, field: 'weightage' | 'target', value: number | null) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, [field]: value } : g))
    )
    setHasUnsaved(true)
    setError('')
  }

  async function handleSaveEdits() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/goals/${sheetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: goals.map((g) => ({
            id: g.id,
            weightage: Number(g.weightage),
            target: g.target,
            targetDate: g.targetDate ? new Date(g.targetDate).toISOString() : null,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to save edits')
        return
      }
      setGoals(json.sheet.goals)
      setHasUnsaved(false)
      setSuccess('Changes saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleApprove() {
    if (hasUnsaved) {
      setError('Please save your edits before approving.')
      return
    }
    if (!isExact100) {
      setError(`Total weightage must be exactly 100% to approve (currently ${totalWeightage.toFixed(1)}%).`)
      return
    }
    setApproving(true)
    setError('')
    try {
      const res = await fetch(`/api/goals/${sheetId}/approve`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to approve')
        return
      }
      setSuccess(`Goal sheet approved and locked! ✓`)
      router.push('/manager/approvals')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setApproving(false)
    }
  }

  async function handleReturn() {
    if (returnComment.trim().length < 10) {
      setError('Return comment must be at least 10 characters.')
      return
    }
    setReturning(true)
    setError('')
    try {
      const res = await fetch(`/api/goals/${sheetId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: returnComment }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to return')
        return
      }
      router.push('/manager/approvals')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setReturning(false)
    }
  }

  const uomLabel: Record<UoMType, string> = {
    NUMERIC_MIN: 'Higher = Better',
    NUMERIC_MAX: 'Lower = Better',
    TIMELINE: 'Timeline',
    ZERO: 'Zero Incidents',
  }

  return (
    <div className="space-y-6">
      {/* Live weightage bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <WeightageBar total={totalWeightage} />
        {hasUnsaved && (
          <p className="text-xs text-amber-400 mt-2">⚠ You have unsaved edits</p>
        )}
      </div>

      {/* Inline-editable goals table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Goals — Inline Edit
          </h2>
          {hasUnsaved && (
            <button
              onClick={handleSaveEdits}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Saving...' : 'Save Edits'}
            </button>
          )}
        </div>

        {goals.map((goal, idx) => (
          <div
            key={goal.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{goal.thrustArea}</p>
                <p className="font-medium text-white text-sm">{goal.title}</p>
                {goal.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  {uomLabel[goal.uomType as UoMType]}
                  {goal.isShared && (
                    <span className="ml-2 text-blue-400">· Shared Goal</span>
                  )}
                </p>
              </div>
            </div>

            {/* Editable fields row */}
            <div className="pl-9 grid grid-cols-2 gap-3">
              {/* Weightage — always editable */}
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Weightage (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    value={goal.weightage}
                    onChange={(e) => updateGoalField(goal.id, 'weightage', Number(e.target.value))}
                    className="w-full h-8 px-2 pr-6 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 tabular-nums"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                </div>
              </div>

              {/* Target — editable for NUMERIC types, read-only for others */}
              {(goal.uomType === 'NUMERIC_MIN' || goal.uomType === 'NUMERIC_MAX') && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Target Value</label>
                  <input
                    type="number"
                    step="any"
                    value={goal.target ?? ''}
                    onChange={(e) =>
                      updateGoalField(goal.id, 'target', e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full h-8 px-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500 tabular-nums"
                  />
                </div>
              )}

              {goal.uomType === 'TIMELINE' && goal.targetDate && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">Target Date</label>
                  <input
                    type="date"
                    value={new Date(goal.targetDate).toISOString().split('T')[0]}
                    disabled
                    className="w-full h-8 px-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-400 text-sm cursor-not-allowed"
                  />
                </div>
              )}

              {goal.uomType === 'ZERO' && (
                <div className="flex items-end pb-1">
                  <span className="text-xs text-amber-400/70">Zero incident — no numeric target</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Error / success feedback */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => { setShowReturnDialog(true); setError('') }}
          disabled={approving || returning}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-medium rounded-xl transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Return for Revision
        </button>

        <button
          onClick={handleApprove}
          disabled={!isExact100 || approving || returning || hasUnsaved}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {approving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Approve &amp; Lock</>
          )}
        </button>
      </div>

      {!isExact100 && (
        <p className="text-center text-xs text-gray-600">
          Adjust weightages to total exactly 100% before approving (currently {totalWeightage.toFixed(1)}%)
        </p>
      )}

      {/* Return dialog */}
      {showReturnDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Return for Revision</h3>
              <p className="text-sm text-gray-400 mt-1">
                Explain what {employeeName} needs to fix before resubmitting.
              </p>
            </div>
            <textarea
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              placeholder="e.g. Please increase the weightage on the Revenue goal and clarify the TAT target unit (hours or minutes?)."
              rows={4}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            <p className="text-xs text-gray-600">
              {returnComment.length}/10 min characters
            </p>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReturnDialog(false); setError('') }}
                className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReturn}
                disabled={returning || returnComment.trim().length < 10}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {returning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {returning ? 'Returning...' : 'Send Back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { ProgressScore } from '@/components/goals/ProgressScore'
import { CheckinHistory } from '@/components/checkins/CheckinHistory'
import { displayScore } from '@/lib/score-calculator'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']
const QUARTER_WINDOWS: Record<Quarter, string> = { Q1: 'Jul', Q2: 'Oct', Q3: 'Jan', Q4: 'Apr' }

interface Achievement {
  quarter: Quarter; status: string
  actualValue: number | null; actualDate: string | null
  isZeroAchieved: boolean | null; progressScore: number | null; notes: string | null
}
interface Goal {
  id: string; title: string; thrustArea: string; uomType: string
  target: number | null; targetDate: string | null; weightage: number
  achievements: Achievement[]
}
interface Checkin {
  id: string; quarter: Quarter; comment: string; createdAt: string
  manager: { id: string; name: string; role: string }
}
interface Props {
  sheet: {
    id: string; status: string
    employee: { id: string; name: string; email: string; department: { name: string } | null }
    goals: Goal[]
    checkins: Checkin[]
  }
}

export function ManagerCheckinPanel({ sheet }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [checkins, setCheckins] = useState<Checkin[]>(sheet.checkins)
  const [selectedQ, setSelectedQ] = useState<Quarter>('Q1')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Compute weighted overall score per quarter
  function overallScore(q: Quarter): number | null {
    let weightedSum = 0, totalWeight = 0
    for (const g of sheet.goals) {
      const a = g.achievements.find(x => x.quarter === q)
      if (a?.progressScore != null) {
        weightedSum += a.progressScore * g.weightage
        totalWeight += g.weightage
      }
    }
    return totalWeight > 0 ? weightedSum / totalWeight : null
  }

  function actualDisplay(goal: Goal, q: Quarter): string {
    const a = goal.achievements.find(x => x.quarter === q)
    if (!a) return '—'
    if (goal.uomType === 'ZERO') return a.isZeroAchieved ? '✓ Zero' : '✗ Incidents'
    if (goal.uomType === 'TIMELINE') return a.actualDate ? new Date(a.actualDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'
    return a.actualValue != null ? a.actualValue.toLocaleString() : '—'
  }

  async function handleComment() {
    setError(''); setSuccess('')
    if (!comment.trim() || comment.trim().length < 10) { setError('Comment must be at least 10 characters.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalSheetId: sheet.id, quarter: selectedQ, comment: comment.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to save comment.'); return }
      setCheckins(prev => [json.checkin, ...prev])
      setComment('')
      setSuccess(`✓ Check-in comment added for ${selectedQ}`)
    } catch { setError('Network error.') }
    finally { setSaving(false) }
  }

  const initials = sheet.employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Employee header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-5 hover:bg-gray-800/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-white">{sheet.employee.name}</p>
          <p className="text-xs text-gray-500">{sheet.employee.department?.name ?? 'No department'} · {sheet.goals.length} goals</p>
        </div>
        {/* Overall scores mini */}
        <div className="hidden sm:flex gap-3 mr-2">
          {QUARTERS.map(q => {
            const s = overallScore(q)
            return (
              <div key={q} className="text-center">
                <p className="text-xs text-gray-600">{q}</p>
                {s != null ? (
                  <p className="text-xs font-semibold text-white">{displayScore(s)}</p>
                ) : (
                  <p className="text-xs text-gray-700">—</p>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/manager/approvals/${sheet.id}`}
            onClick={e => e.stopPropagation()}
            className="p-1.5 rounded-lg text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800">
          {/* Planned vs Actual table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium w-1/3">Goal</th>
                  <th className="text-right px-3 py-3 text-xs text-gray-500 font-medium">Target</th>
                  {QUARTERS.map(q => (
                    <th key={q} className="text-center px-3 py-3 text-xs text-gray-500 font-medium">
                      {q}<span className="text-gray-700 ml-1">({QUARTER_WINDOWS[q]})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sheet.goals.map(goal => (
                  <tr key={goal.id} className="hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white text-xs leading-snug">{goal.title}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{goal.thrustArea} · {goal.weightage}%</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-xs text-gray-400">
                        {goal.uomType === 'ZERO' ? 'Zero' : goal.uomType === 'TIMELINE'
                          ? (goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A')
                          : goal.target?.toLocaleString() ?? 'N/A'}
                      </span>
                    </td>
                    {QUARTERS.map(q => {
                      const a = goal.achievements.find(x => x.quarter === q)
                      return (
                        <td key={q} className="px-3 py-3 text-center">
                          <p className="text-xs text-gray-300">{actualDisplay(goal, q)}</p>
                          {a?.progressScore != null && (
                            <ProgressScore score={a.progressScore} size="sm" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {/* Overall row */}
                <tr className="bg-gray-800/30">
                  <td colSpan={2} className="px-4 py-2 text-xs text-gray-500 font-semibold">Overall Weighted Score</td>
                  {QUARTERS.map(q => {
                    const s = overallScore(q)
                    return (
                      <td key={q} className="px-3 py-2 text-center">
                        {s != null ? <ProgressScore score={s} size="sm" /> : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comment section */}
          <div className="p-5 border-t border-gray-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" /> Add Check-in Comment
            </h3>

            <div className="flex gap-2 flex-wrap">
              {QUARTERS.map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQ(q)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                    selectedQ === q
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {q} ({QUARTER_WINDOWS[q]})
                </button>
              ))}
            </div>

            <textarea
              value={comment} onChange={e => setComment(e.target.value)}
              placeholder={`Write your ${selectedQ} check-in comment for ${sheet.employee.name}… (min 10 characters)`}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 resize-none transition-colors"
            />

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
              onClick={handleComment} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {saving ? 'Saving...' : `Post ${selectedQ} Comment`}
            </button>

            {/* Check-in history */}
            {checkins.length > 0 && (
              <div className="pt-4 border-t border-gray-800">
                <h4 className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wider">Comment History</h4>
                <CheckinHistory checkins={checkins} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

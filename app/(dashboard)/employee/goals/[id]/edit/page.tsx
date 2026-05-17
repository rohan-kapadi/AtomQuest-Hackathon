'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Loader2, Save, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import Link from 'next/link'
import { WeightageBar } from '@/components/goals/WeightageBar'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GoalDraft {
  thrustArea: string
  title: string
  description: string
  uomType: 'NUMERIC_MIN' | 'NUMERIC_MAX' | 'TIMELINE' | 'ZERO'
  target: string
  targetDate: string
  weightage: string
  isReadOnly?: boolean
}

interface Sheet {
  id: string
  status: string
  cycle: { name: string }
  goals: Array<{
    id: string; thrustArea: string; title: string; description: string | null
    uomType: string; target: number | null; targetDate: string | null
    weightage: number; isShared: boolean; isReadOnly: boolean
  }>
}

const BLANK_GOAL: GoalDraft = {
  thrustArea: '', title: '', description: '',
  uomType: 'NUMERIC_MIN', target: '', targetDate: '', weightage: '10',
}

const UOM_OPTIONS = [
  { value: 'NUMERIC_MIN', label: 'Numeric — Higher is Better' },
  { value: 'NUMERIC_MAX', label: 'Numeric — Lower is Better' },
  { value: 'TIMELINE',    label: 'Timeline / Milestone' },
  { value: 'ZERO',        label: 'Zero Incidents' },
]

const INPUT = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500'
const ERR   = 'text-red-400 text-xs mt-1'

export default function EditGoalSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [goals, setGoals] = useState<GoalDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/goals/${id}`)
      .then(r => r.json())
      .then(json => {
        if (!json.sheet) { setFetchError('Sheet not found.'); return }
        if (json.sheet.status !== 'DRAFT' && json.sheet.status !== 'RETURNED') {
          router.replace(`/employee/goals/${id}`); return
        }
        setSheet(json.sheet)
        setGoals(
          json.sheet.goals.map((g: Sheet['goals'][0]) => ({
            thrustArea:  g.thrustArea,
            title:       g.title,
            description: g.description ?? '',
            uomType:     g.uomType as GoalDraft['uomType'],
            target:      g.target?.toString() ?? '',
            targetDate:  g.targetDate ? new Date(g.targetDate).toISOString().split('T')[0] : '',
            weightage:   g.weightage.toString(),
            isReadOnly:  g.isReadOnly,
          }))
        )
      })
      .catch(() => setFetchError('Failed to load goal sheet.'))
      .finally(() => setLoading(false))
  }, [id, router])

  const totalWeightage = goals.reduce((sum, g) => sum + (parseFloat(g.weightage) || 0), 0)

  function updateGoal(index: number, field: keyof GoalDraft, value: string) {
    setGoals(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g))
  }

  function addGoal() {
    if (goals.length >= 8) return
    setGoals(prev => [...prev, { ...BLANK_GOAL }])
  }

  function removeGoal(index: number) {
    setGoals(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaveError('')
    setSaveSuccess(false)

    if (goals.length === 0) { setSaveError('Add at least one goal.'); return }

    for (let i = 0; i < goals.length; i++) {
      const g = goals[i]
      if (!g.thrustArea.trim())  { setSaveError(`Goal #${i+1}: Thrust Area is required.`); return }
      if (!g.title.trim())       { setSaveError(`Goal #${i+1}: Title is required.`); return }
      if ((g.uomType === 'NUMERIC_MIN' || g.uomType === 'NUMERIC_MAX') && !g.target) {
        setSaveError(`Goal #${i+1}: Target value is required for numeric goals.`); return
      }
      if (g.uomType === 'TIMELINE' && !g.targetDate) {
        setSaveError(`Goal #${i+1}: Target date is required for timeline goals.`); return
      }
      if ((parseFloat(g.weightage) || 0) < 10) {
        setSaveError(`Goal #${i+1}: Minimum weightage is 10%.`); return
      }
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: goals.map(g => ({
            thrustArea:  g.thrustArea.trim(),
            title:       g.title.trim(),
            description: g.description.trim() || null,
            uomType:     g.uomType,
            target:      g.target ? parseFloat(g.target) : null,
            targetDate:  g.targetDate || null,
            weightage:   parseFloat(g.weightage) || 10,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setSaveError(json.error ?? 'Failed to save.'); return }
      setSaveSuccess(true)
      setTimeout(() => router.push(`/employee/goals/${id}`), 1500)
    } catch {
      setSaveError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
    </div>
  )

  if (fetchError) return (
    <div className="max-w-3xl mx-auto py-16 text-center">
      <p className="text-red-400">{fetchError}</p>
      <Link href="/employee/goals" className="text-violet-400 text-sm mt-4 inline-block hover:underline">← Back</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href={`/employee/goals/${id}`}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Goal Sheet
        </Link>
        <h1 className="text-2xl font-bold text-white">Edit Goal Sheet</h1>
        <p className="text-gray-400 mt-1 text-sm">{sheet?.cycle.name} · Update your goals and save.</p>
      </div>

      {/* Weightage bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <WeightageBar total={totalWeightage} />
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{goals.length} / 8 goals</span>
          <span>{Math.abs(totalWeightage - 100) <= 0.01 ? '✓ Balanced' : `${(100 - totalWeightage).toFixed(1)}% remaining`}</span>
        </div>
      </div>

      {/* Goal rows */}
      <div className="space-y-4">
        {goals.map((goal, idx) => (
          <div key={idx} className="group bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            {/* Row header */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
              </div>
              <span className="text-sm font-semibold text-gray-300 flex-1">Goal #{idx + 1}</span>
              {goals.length > 1 && !goal.isReadOnly && (
                <button onClick={() => removeGoal(idx)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thrust Area */}
              <div>
                <label className="text-xs text-gray-400 font-medium">Thrust Area <span className="text-red-400">*</span></label>
                <input value={goal.thrustArea} onChange={e => updateGoal(idx, 'thrustArea', e.target.value)}
                  placeholder="e.g. Revenue Growth" className={`${INPUT} mt-1`} disabled={goal.isReadOnly} />
              </div>

              {/* UoM Type */}
              <div>
                <label className="text-xs text-gray-400 font-medium">Measurement Type <span className="text-red-400">*</span></label>
                <select value={goal.uomType} onChange={e => updateGoal(idx, 'uomType', e.target.value)}
                  className={`${INPUT} mt-1 h-9`} disabled={goal.isReadOnly}>
                  {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Title — full width */}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 font-medium">Goal Title <span className="text-red-400">*</span></label>
                <input value={goal.title} onChange={e => updateGoal(idx, 'title', e.target.value)}
                  placeholder="e.g. Achieve quarterly sales target of ₹50L" className={`${INPUT} mt-1`} disabled={goal.isReadOnly} />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 font-medium">Description <span className="text-gray-600">(optional)</span></label>
                <textarea value={goal.description} onChange={e => updateGoal(idx, 'description', e.target.value)}
                  placeholder="Success criteria, measurement methodology..." rows={2}
                  className={`${INPUT} mt-1 resize-none`} disabled={goal.isReadOnly} />
              </div>

              {/* Target (numeric) */}
              {(goal.uomType === 'NUMERIC_MIN' || goal.uomType === 'NUMERIC_MAX') && (
                <div>
                  <label className="text-xs text-gray-400 font-medium">Target Value <span className="text-red-400">*</span></label>
                  <input type="number" step="any" value={goal.target}
                    onChange={e => updateGoal(idx, 'target', e.target.value)}
                    placeholder="e.g. 5000000" className={`${INPUT} mt-1`} disabled={goal.isReadOnly} />
                  <p className="text-gray-600 text-xs mt-1">
                    {goal.uomType === 'NUMERIC_MIN' ? 'Score = actual ÷ target' : 'Score = target ÷ actual'}
                  </p>
                </div>
              )}

              {/* Target date (timeline) */}
              {goal.uomType === 'TIMELINE' && (
                <div>
                  <label className="text-xs text-gray-400 font-medium">Target Date <span className="text-red-400">*</span></label>
                  <input type="date" value={goal.targetDate}
                    onChange={e => updateGoal(idx, 'targetDate', e.target.value)}
                    className={`${INPUT} mt-1`} disabled={goal.isReadOnly} />
                </div>
              )}

              {/* Zero info */}
              {goal.uomType === 'ZERO' && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    Zero incident goal: 100% if zero incidents, 0% if any occur. No target needed.
                  </div>
                </div>
              )}

              {/* Weightage */}
              <div>
                <label className="text-xs text-gray-400 font-medium">Weightage (%) <span className="text-red-400">*</span></label>
                <div className="relative mt-1">
                  <input type="number" min={10} max={100} step={5} value={goal.weightage}
                    onChange={e => updateGoal(idx, 'weightage', e.target.value)}
                    className={`${INPUT} pr-7`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                </div>
                <p className="text-gray-600 text-xs mt-1">Min 10% per goal</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add goal */}
      <button type="button" onClick={addGoal} disabled={goals.length >= 8 || isSaving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-700 text-gray-500 hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/5 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus className="w-4 h-4" />
        {goals.length < 8 ? `Add Goal (${goals.length}/8)` : 'Maximum 8 goals reached'}
      </button>

      {/* Feedback */}
      {saveError && (
        <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
          <AlertCircle className="h-4 w-4" /><AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      {saveSuccess && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /><AlertDescription>Changes saved! Redirecting...</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Link href={`/employee/goals/${id}`}
          className="flex-1 flex items-center justify-center py-3 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white rounded-xl text-sm transition-colors">
          Cancel
        </Link>
        <button onClick={handleSave} disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50">
          {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  )
}

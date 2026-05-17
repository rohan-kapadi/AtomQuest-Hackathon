'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Share2, Loader2, AlertCircle, CheckCircle2, User, Info, Search } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Employee {
  id: string
  name: string
  email: string
  role: string
  department: { name: string } | null
}

interface Props {
  employees: Employee[]
  cycleId: string
  disabled?: boolean
}

const UOM_OPTIONS = [
  { value: 'NUMERIC_MIN', label: 'Numeric — Higher is Better' },
  { value: 'NUMERIC_MAX', label: 'Numeric — Lower is Better' },
  { value: 'TIMELINE',    label: 'Timeline / Milestone' },
  { value: 'ZERO',        label: 'Zero Incidents' },
]

const INPUT = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors'

export function SharedGoalForm({ employees, cycleId, disabled = false }: Props) {
  const router = useRouter()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [goal, setGoal] = useState({
    thrustArea: '',
    title: '',
    description: '',
    uomType: 'NUMERIC_MIN' as 'NUMERIC_MIN' | 'NUMERIC_MAX' | 'TIMELINE' | 'ZERO',
    target: '',
    targetDate: '',
    weightage: '20',
  })

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function toggleEmployee(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedIds(filteredEmployees.map((e) => e.id))
  }

  function clearAll() {
    setSelectedIds([])
  }

  function updateGoal(field: string, value: string) {
    setGoal((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    setError('')
    setSuccess('')

    if (selectedIds.length === 0) { setError('Select at least one employee.'); return }
    if (!goal.thrustArea.trim()) { setError('Thrust Area is required.'); return }
    if (!goal.title.trim()) { setError('Goal Title is required.'); return }
    if (!goal.uomType) { setError('Measurement type is required.'); return }
    if ((goal.uomType === 'NUMERIC_MIN' || goal.uomType === 'NUMERIC_MAX') && !goal.target) {
      setError('Target value is required for numeric goals.'); return
    }
    if (goal.uomType === 'TIMELINE' && !goal.targetDate) {
      setError('Target date is required for timeline goals.'); return
    }
    const weightage = parseFloat(goal.weightage) || 0
    if (weightage < 10 || weightage > 100) { setError('Weightage must be between 10% and 100%.'); return }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/shared-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: selectedIds,
          goal: {
            thrustArea: goal.thrustArea.trim(),
            title: goal.title.trim(),
            description: goal.description.trim() || null,
            uomType: goal.uomType,
            target: goal.target ? parseFloat(goal.target) : null,
            targetDate: goal.targetDate || null,
            weightage,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to push shared goal.'); return }

      setSuccess(`✓ Pushed "${goal.title}" to ${json.results?.length ?? selectedIds.length} employee(s).`)
      setSelectedIds([])
      setGoal({ thrustArea: '', title: '', description: '', uomType: 'NUMERIC_MIN', target: '', targetDate: '', weightage: '20' })
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const primaryEmployee = employees.find((e) => e.id === selectedIds[0])

  return (
    <div className="space-y-6">
      {/* Employee selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Select Recipients</h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Select all
            </button>
            <span className="text-gray-700">·</span>
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Clear
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or department..."
            className={`${INPUT} pl-9`}
          />
        </div>

        {/* Employee list */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {filteredEmployees.map((employee, idx) => {
            const isSelected = selectedIds.includes(employee.id)
            const isPrimary = selectedIds[0] === employee.id
            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => toggleEmployee(employee.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-violet-500/15 border-violet-500/30 text-white'
                    : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${
                  isSelected ? 'bg-violet-600 border-violet-500' : 'border-gray-600'
                }`}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>

                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isPrimary ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}>
                  {employee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{employee.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {employee.department?.name ?? employee.role} · {employee.email}
                  </p>
                </div>

                {isPrimary && (
                  <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full flex-shrink-0">
                    Primary
                  </span>
                )}
              </button>
            )
          })}
          {filteredEmployees.length === 0 && (
            <p className="text-center text-gray-600 text-sm py-4">No employees match your search.</p>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            <Info className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              <strong>{selectedIds.length}</strong> selected.
              {primaryEmployee && <> <strong>{primaryEmployee.name}</strong> will be the primary owner — their achievement syncs to all copies.</>}
            </span>
          </div>
        )}
      </div>

      {/* Goal definition form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Define Shared Goal</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Thrust Area */}
          <div>
            <label className="text-xs text-gray-400 font-medium">Thrust Area <span className="text-red-400">*</span></label>
            <input value={goal.thrustArea} onChange={(e) => updateGoal('thrustArea', e.target.value)}
              placeholder="e.g. Safety & Compliance" className={`${INPUT} mt-1`} />
          </div>

          {/* UoM */}
          <div>
            <label className="text-xs text-gray-400 font-medium">Measurement Type <span className="text-red-400">*</span></label>
            <select value={goal.uomType} onChange={(e) => updateGoal('uomType', e.target.value)}
              className={`${INPUT} mt-1 h-9`}>
              {UOM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 font-medium">Goal Title <span className="text-red-400">*</span></label>
            <input value={goal.title} onChange={(e) => updateGoal('title', e.target.value)}
              placeholder="e.g. Maintain zero workplace safety incidents" className={`${INPUT} mt-1`} />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400 font-medium">Description <span className="text-gray-600">(optional)</span></label>
            <textarea value={goal.description} onChange={(e) => updateGoal('description', e.target.value)}
              placeholder="Measurement criteria, definitions, scope..." rows={2}
              className={`${INPUT} mt-1 resize-none`} />
          </div>

          {/* Target (numeric) */}
          {(goal.uomType === 'NUMERIC_MIN' || goal.uomType === 'NUMERIC_MAX') && (
            <div>
              <label className="text-xs text-gray-400 font-medium">Target Value <span className="text-red-400">*</span></label>
              <input type="number" step="any" value={goal.target}
                onChange={(e) => updateGoal('target', e.target.value)}
                placeholder="e.g. 100" className={`${INPUT} mt-1`} />
            </div>
          )}

          {/* Target date (timeline) */}
          {goal.uomType === 'TIMELINE' && (
            <div>
              <label className="text-xs text-gray-400 font-medium">Target Date <span className="text-red-400">*</span></label>
              <input type="date" value={goal.targetDate}
                onChange={(e) => updateGoal('targetDate', e.target.value)}
                className={`${INPUT} mt-1`} />
            </div>
          )}

          {goal.uomType === 'ZERO' && (
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                Zero incident goal: 100% score if zero incidents occur, 0% otherwise. No target needed.
              </div>
            </div>
          )}

          {/* Default Weightage */}
          <div>
            <label className="text-xs text-gray-400 font-medium">Default Weightage (%) <span className="text-red-400">*</span></label>
            <div className="relative mt-1">
              <input type="number" min={10} max={100} step={5} value={goal.weightage}
                onChange={(e) => updateGoal('weightage', e.target.value)}
                className={`${INPUT} pr-7`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Recipients can adjust this on their own sheet.</p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
          <AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /><AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || disabled || selectedIds.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Pushing to {selectedIds.length} employee(s)...</>
        ) : (
          <><Share2 className="w-4 h-4" /> Push Goal to {selectedIds.length || '...'} Employee{selectedIds.length !== 1 ? 's' : ''}</>
        )}
      </button>
    </div>
  )
}

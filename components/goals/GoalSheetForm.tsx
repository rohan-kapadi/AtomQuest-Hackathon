'use client'

import { useForm, useFieldArray, FormProvider } from 'react-hook-form'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { GoalRow } from './GoalRow'
import { WeightageBar } from './WeightageBar'
import { AIGoalAssistant } from './AIGoalAssistant'
import { GoalSheetCreateSchema, type GoalSheetCreateInput } from '@/lib/validations'

interface GoalCycle {
  id: string
  name: string
  isActive: boolean
}

interface GoalSheetFormProps {
  cycles: GoalCycle[]
  defaultCycleId?: string
}

const DEFAULT_GOAL: GoalSheetCreateInput['goals'][0] = {
  thrustArea: '',
  title: '',
  description: '',
  uomType: 'NUMERIC_MIN',
  target: undefined,
  targetDate: undefined,
  weightage: 20,
}

export function GoalSheetForm({ cycles, defaultCycleId }: GoalSheetFormProps) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const activeCycle = cycles.find((c) => c.isActive)

  const methods = useForm({
    defaultValues: {
      cycleId: defaultCycleId ?? activeCycle?.id ?? '',
      goals: [{ ...DEFAULT_GOAL }],
    },
  })

  const {
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = methods

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'goals',
  })

  const goals = watch('goals')
  const cycleId = watch('cycleId')
  const totalWeightage = goals.reduce((sum, g) => sum + (Number(g.weightage) || 0), 0)
  const MAX_GOALS = 8
  const canAddGoal = fields.length < MAX_GOALS

  // Save as Draft — bypasses full Zod validation, saves whatever exists
  async function handleSaveDraft() {
    setSubmitError('')
    const values = getValues()

    if (!values.cycleId) {
      setSubmitError('Please select a goal cycle before saving.')
      return
    }
    if (!values.goals || values.goals.length === 0) {
      setSubmitError('Add at least one goal before saving.')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          // Already has a sheet for this cycle — navigate to it
          router.push(`/employee/goals/${json.sheetId}`)
          return
        }
        setSubmitError(json.error ?? 'Failed to save draft')
        return
      }
      router.push(`/employee/goals/${json.sheet.id}`)
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Save + Submit — uses getValues() directly to avoid silent Zod failures
  async function handleSaveAndSubmit() {
    setSubmitError('')
    const values = getValues()

    // Explicit pre-checks with clear error messages
    if (!values.cycleId) {
      setSubmitError('Please select a goal cycle.')
      return
    }
    if (!values.goals || values.goals.length === 0) {
      setSubmitError('Add at least one goal before submitting.')
      return
    }

    const total = values.goals.reduce((sum, g) => sum + (Number(g.weightage) || 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      setSubmitError(`Total weightage must equal 100% to submit (currently ${total.toFixed(1)}%).`)
      return
    }

    // Validate each goal has required fields
    for (let i = 0; i < values.goals.length; i++) {
      const g = values.goals[i]
      if (!g.thrustArea?.trim()) { setSubmitError(`Goal #${i + 1}: Thrust Area is required.`); return }
      if (!g.title?.trim()) { setSubmitError(`Goal #${i + 1}: Goal Title is required.`); return }
      if (!g.uomType) { setSubmitError(`Goal #${i + 1}: Measurement type is required.`); return }
      if ((g.uomType === 'NUMERIC_MIN' || g.uomType === 'NUMERIC_MAX') && (g.target === undefined || g.target === null || isNaN(Number(g.target)))) {
        setSubmitError(`Goal #${i + 1}: Target value is required for numeric goals.`); return
      }
      if (g.uomType === 'TIMELINE' && !g.targetDate) {
        setSubmitError(`Goal #${i + 1}: Target date is required for timeline goals.`); return
      }
      if (Number(g.weightage) < 10) {
        setSubmitError(`Goal #${i + 1}: Minimum weightage is 10%.`); return
      }
    }

    setIsSubmitting(true)
    try {
      // Step 1: Create the draft sheet
      const createRes = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const createJson = await createRes.json()

      if (!createRes.ok) {
        // Debug: log full validation issues to browser console
        console.error('[GoalSheetForm] API error:', createJson)
        if (createJson.issues) {
          console.error('[GoalSheetForm] Zod issues:', JSON.stringify(createJson.issues, null, 2))
        }
        if (createRes.status === 409) {
          setSubmitError('You already have a goal sheet for this cycle. Go to My Goals to view or edit it.')
          return
        }
        setSubmitError(createJson.error ?? `Error ${createRes.status}: Failed to save goals.`)
        return
      }

      // Step 2: Submit the newly created sheet
      const sheetId = createJson.sheet.id
      const submitRes = await fetch(`/api/goals/${sheetId}/submit`, { method: 'POST' })
      const submitJson = await submitRes.json()
      if (!submitRes.ok) {
        setSubmitError(submitJson.error ?? 'Failed to submit for approval.')
        return
      }

      router.push('/employee/goals')
      router.refresh()
    } catch (e) {
      setSubmitError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isExactly100 = Math.abs(totalWeightage - 100) <= 0.01
  const isAnyLoading = isSubmitting || isSaving

  return (
    <FormProvider {...methods}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header with AI Assistant */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Goal Sheet</h1>
          <AIGoalAssistant />
        </div>

        {/* Cycle selector */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-sm font-medium">
              Goal Cycle <span className="text-red-400">*</span>
            </Label>
            <select
              value={cycleId}
              onChange={(e) => setValue('cycleId', e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
            >
              <option value="">Select a cycle...</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name} {cycle.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
            {errors.cycleId && (
              <p className="text-red-400 text-xs">{errors.cycleId.message}</p>
            )}
          </div>
        </div>

        {/* Weightage summary — sticky at top */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <WeightageBar total={totalWeightage} />
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{fields.length} / {MAX_GOALS} goals</span>
            <span>
              {isExactly100
                ? '✓ Ready to submit'
                : `${(100 - totalWeightage).toFixed(1)}% remaining`}
            </span>
          </div>
        </div>

        {/* Goal rows */}
        <div className="space-y-3">
          {fields.map((field, index) => (
            <GoalRow
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
        </div>

        {/* Add goal button */}
        <button
          type="button"
          onClick={() => append({ ...DEFAULT_GOAL, weightage: 10 })}
          disabled={!canAddGoal || isAnyLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-700 text-gray-500 hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/5 transition-all duration-200 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-700 disabled:hover:text-gray-500"
        >
          <Plus className="w-4 h-4" />
          {canAddGoal
            ? `Add Goal (${fields.length}/${MAX_GOALS})`
            : `Maximum ${MAX_GOALS} goals reached`}
        </button>

        {/* Error display */}
        {submitError && (
          <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Root-level validation errors */}
        {errors.goals?.root && (
          <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription>{errors.goals.root.message}</AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isAnyLoading}
            className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              'Save as Draft'
            )}
          </Button>

          <Button
            type="button"
            onClick={handleSaveAndSubmit}
            disabled={isAnyLoading || !isExactly100}
            className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-medium shadow-lg shadow-violet-500/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit for Approval
                {!isExactly100 && ` (${totalWeightage.toFixed(0)}%)`}
              </>
            )}
          </Button>
        </div>

        {!isExactly100 && totalWeightage > 0 && (
          <p className="text-center text-xs text-gray-600">
            Total must equal exactly 100% to submit. You can save as draft anytime.
          </p>
        )}
      </div>
    </FormProvider>
  )
}

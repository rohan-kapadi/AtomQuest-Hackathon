'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SubmitButtonProps {
  sheetId: string
  totalWeightage: number
  goalCount: number
}

export function SubmitButton({ sheetId, totalWeightage, goalCount }: SubmitButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const isReady = Math.abs(totalWeightage - 100) <= 0.01 && goalCount > 0

  async function handleSubmit() {
    if (!isReady) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`/api/goals/${sheetId}/submit`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit')
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/employee/goals'), 1500)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300">
        <CheckCircle2 className="w-5 h-5" />
        <span className="font-medium">Submitted successfully! Redirecting...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isReady || loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
        ) : (
          <><Send className="w-4 h-4" /> Submit for Manager Approval</>
        )}
      </button>

      {!isReady && (
        <p className="text-center text-xs text-gray-600">
          {goalCount === 0
            ? 'Add at least one goal to submit.'
            : `Total weightage must be 100% to submit (currently ${totalWeightage.toFixed(1)}%).`}
        </p>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Unlock, Loader2, AlertCircle, X } from 'lucide-react'

interface Props {
  sheetId: string
  employeeName: string
}

export function UnlockButton({ sheetId, employeeName }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleUnlock() {
    setError('')
    if (reason.trim().length < 10) { setError('Reason must be at least 10 characters.'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/goals/${sheetId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to unlock.'); return }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm rounded-xl transition-all"
      >
        <Unlock className="w-4 h-4" /> Unlock Sheet
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Unlock Goal Sheet</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Unlocking <strong>{employeeName}</strong>'s sheet will set it back to DRAFT.
                  They must re-submit for approval.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">
                Reason for unlocking <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why this sheet needs to be unlocked and re-reviewed… (min 10 characters)"
                rows={3}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-red-500 resize-none transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-xl bg-gray-800 border border-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                {loading ? 'Unlocking...' : 'Confirm Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

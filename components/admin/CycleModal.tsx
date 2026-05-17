'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Edit } from 'lucide-react'
import type { GoalCycle } from '@prisma/client'

interface CycleModalProps {
  cycle?: GoalCycle
  mode: 'create' | 'edit'
}

export function CycleModal({ cycle, mode }: CycleModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatDateForInput = (dateStr: Date | undefined) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    name: cycle?.name || '',
    startDate: formatDateForInput(cycle?.startDate) || '',
    endDate: formatDateForInput(cycle?.endDate) || '',
    isActive: cycle ? cycle.isActive : false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = mode === 'create' ? '/api/cycles' : `/api/cycles/${cycle?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setOpen(false)
      if (mode === 'create') {
        setFormData({ name: '', startDate: '', endDate: '', isActive: false })
      }
      router.refresh()
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {mode === 'create' ? (
        <button 
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Create New Cycle
        </button>
      ) : (
        <button 
          onClick={() => setOpen(true)}
          className="text-xs font-semibold flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
        >
          <Edit className="w-3.5 h-3.5" /> Edit Cycle Details
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-bold text-white">
                {mode === 'create' ? 'Create New Goal Cycle' : 'Edit Goal Cycle'}
              </h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Cycle Name *</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  placeholder="e.g. FY 2025-26"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Start Date *</label>
                  <input 
                    required
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">End Date *</label>
                  <input 
                    required
                    type="date"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-gray-900"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-medium text-gray-300">
                  Set as Active Cycle
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-7">
                Setting this to active will automatically deactivate any currently active cycle.
              </p>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-800">
                <button 
                  type="button" 
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === 'create' ? 'Create Cycle' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

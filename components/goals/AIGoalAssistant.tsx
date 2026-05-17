'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Target, Plus, X } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

interface SuggestedGoal {
  title: string
  thrustArea: string
  uomType: 'NUMERIC_MIN' | 'NUMERIC_MAX' | 'TIMELINE' | 'ZERO'
  target: number | string | null
  weightage: number
  rationale: string
}

export function AIGoalAssistant() {
  const [open, setOpen] = useState(false)
  const [roleDesc, setRoleDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([])

  const { getValues, setValue } = useFormContext()

  async function handleSuggest() {
    if (!roleDesc.trim()) {
      setError('Please describe your role briefly.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/suggest-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleDescription: roleDesc }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to get suggestions')
        setLoading(false)
        return
      }
      setSuggestions(data.suggestions)
    } catch {
      setError('Network error getting suggestions')
    } finally {
      setLoading(false)
    }
  }

  function addSuggestion(suggestion: SuggestedGoal) {
    const currentGoals = getValues('goals') || []
    if (currentGoals.length >= 8) {
      alert('Maximum of 8 goals allowed.')
      return
    }
    const newGoal = {
      thrustArea: suggestion.thrustArea,
      title: suggestion.title,
      description: suggestion.rationale,
      uomType: suggestion.uomType,
      target: suggestion.target,
      targetDate: suggestion.uomType === 'TIMELINE' && suggestion.target ? new Date(suggestion.target) : undefined,
      weightage: suggestion.weightage,
    }
    setValue('goals', [...currentGoals, newGoal], { shouldValidate: true })
    setSuggestions(suggestions.filter((s) => s.title !== suggestion.title))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 text-violet-300 hover:from-violet-600/30 hover:to-fuchsia-600/30 hover:text-white rounded-xl text-sm font-semibold transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Suggest Goals with AI
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-none">AI Goal Assistant</h2>
                  <p className="text-xs text-gray-500 mt-1">Generate SMART goals tailored to your role</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Input section */}
              {suggestions.length === 0 && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-300">
                    Describe your role and objectives for this year
                  </label>
                  <textarea
                    value={roleDesc}
                    onChange={(e) => setRoleDesc(e.target.value)}
                    placeholder="e.g. I am a Senior Frontend Engineer focusing on performance optimization, accessibility, and mentoring junior developers..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                  />
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    onClick={handleSuggest}
                    disabled={loading || !roleDesc.trim()}
                    className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Generating suggestions...' : 'Generate Goals'}
                  </button>
                </div>
              )}

              {/* Results section */}
              {suggestions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-300">Suggested Goals</p>
                    <button
                      onClick={() => setSuggestions([])}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Generate again
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {suggestions.map((suggestion, idx) => (
                      <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 transition-all hover:bg-gray-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-medium text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-full border border-violet-400/20">
                                {suggestion.thrustArea}
                              </span>
                              <span className="text-xs text-gray-500">·</span>
                              <span className="text-xs font-semibold text-gray-400">{suggestion.weightage}% Weightage</span>
                            </div>
                            <h3 className="text-sm font-bold text-white">{suggestion.title}</h3>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{suggestion.rationale}</p>
                            <div className="mt-3 flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-gray-300">
                                  {suggestion.uomType} 
                                  {suggestion.target && ` → Target: ${suggestion.target}`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => addSuggestion(suggestion)}
                            className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
                            title="Add to my goals"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { MessageSquare, User, Calendar } from 'lucide-react'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface Checkin {
  id: string
  quarter: Quarter
  comment: string
  createdAt: string
  manager: { id: string; name: string; role: string }
}

interface Props {
  checkins: Checkin[]
}

const QUARTER_COLORS: Record<Quarter, string> = {
  Q1: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Q2: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Q3: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Q4: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

export function CheckinHistory({ checkins }: Props) {
  if (checkins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="w-8 h-8 text-gray-700 mb-2" />
        <p className="text-gray-500 text-sm">No check-in comments yet.</p>
        <p className="text-gray-600 text-xs mt-1">Your manager's comments will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {checkins.map((checkin, idx) => (
        <div key={checkin.id} className="relative pl-6">
          {/* Timeline line */}
          {idx < checkins.length - 1 && (
            <div className="absolute left-2 top-6 bottom-0 w-px bg-gray-800" />
          )}
          {/* Timeline dot */}
          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${QUARTER_COLORS[checkin.quarter]}`}>
                  {checkin.quarter}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <User className="w-3 h-3" />
                  {checkin.manager.name}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Calendar className="w-3 h-3" />
                {new Date(checkin.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </div>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{checkin.comment}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

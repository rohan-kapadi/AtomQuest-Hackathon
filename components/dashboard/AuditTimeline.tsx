'use client'

import Link from 'next/link'
import {
  Shield, CheckCircle2, RotateCcw, Unlock, Target,
  BarChart2, Share2, MessageSquare, ClipboardList, ArrowRight
} from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  fieldChanged: string | null
  oldValue: string | null
  newValue: string | null
  reason: string | null
  timestamp: string
  user: { id: string; name: string; role: string }
  goalSheet: { id: string; employeeName: string; cycleName: string }
}

interface Props {
  logs: AuditLog[]
}

const ACTION_META: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  GOAL_SUBMITTED:      { icon: ClipboardList, color: 'border-blue-500/20 bg-blue-500/10 text-blue-300', label: 'Submitted' },
  GOAL_APPROVED:       { icon: CheckCircle2, color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300', label: 'Approved' },
  GOAL_RETURNED:       { icon: RotateCcw, color: 'border-amber-500/20 bg-amber-500/10 text-amber-300', label: 'Returned' },
  GOAL_UNLOCKED:       { icon: Unlock, color: 'border-red-500/20 bg-red-500/10 text-red-300', label: 'Unlocked' },
  GOAL_RELOCKED:       { icon: Shield, color: 'border-slate-500/20 bg-slate-500/10 text-slate-300', label: 'Re-locked' },
  TARGET_CHANGED:      { icon: Target, color: 'border-violet-500/20 bg-violet-500/10 text-violet-300', label: 'Target Changed' },
  WEIGHTAGE_CHANGED:   { icon: BarChart2, color: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300', label: 'Weightage Changed' },
  DESCRIPTION_CHANGED: { icon: ClipboardList, color: 'border-slate-500/20 bg-slate-500/10 text-slate-300', label: 'Description Changed' },
  ACHIEVEMENT_LOGGED:  { icon: BarChart2, color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300', label: 'Achievement Logged' },
  ACHIEVEMENT_UPDATED: { icon: BarChart2, color: 'border-amber-500/20 bg-amber-500/10 text-amber-300', label: 'Achievement Updated' },
  SHARED_GOAL_PUSHED:  { icon: Share2, color: 'border-violet-500/20 bg-violet-500/10 text-violet-300', label: 'Shared Goal Pushed' },
  CHECKIN_ADDED:       { icon: MessageSquare, color: 'border-blue-500/20 bg-blue-500/10 text-blue-300', label: 'Check-in Added' },
}

const FALLBACK_META = { icon: Shield, color: 'border-slate-500/20 bg-slate-500/10 text-slate-300', label: 'Unknown' }

function parseVal(raw: string | null): string {
  if (!raw) return '-'
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' ? JSON.stringify(parsed, null, 0) : String(parsed)
  } catch {
    return raw
  }
}

export function AuditTimeline({ logs }: Props) {
  return (
    <div className="space-y-4">
      {logs.map((log, idx) => {
        const meta = ACTION_META[log.action] ?? FALLBACK_META
        const Icon = meta.icon
        const hasChange = log.fieldChanged && (log.oldValue || log.newValue)

        return (
          <div key={log.id} className="relative pl-10">
            {idx < logs.length - 1 && (
              <div className="absolute left-[18px] top-10 bottom-[-16px] w-px bg-white/8" />
            )}

            <div className={`absolute left-0 top-2 flex h-9 w-9 items-center justify-center rounded-2xl border ${meta.color}`}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="glass-panel glass-panel-hover rounded-3xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      by <span className="text-slate-300">{log.user.name}</span> ({log.user.role})
                    </span>
                  </div>
                  <Link
                    href={`/manager/approvals/${log.goalSheet.id}`}
                    className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-violet-300"
                  >
                    {log.goalSheet.employeeName} · {log.goalSheet.cycleName}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <time className="text-xs text-slate-500">
                  {new Date(log.timestamp).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </time>
              </div>

              {hasChange && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3 text-xs">
                  <span className="uppercase tracking-[0.08em] text-slate-500">{log.fieldChanged}</span>
                  <span className="rounded-full bg-red-500/10 px-2 py-1 text-red-300 line-through">{parseVal(log.oldValue)}</span>
                  <span className="text-slate-600">to</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">{parseVal(log.newValue)}</span>
                </div>
              )}

              {log.reason && (
                <div className="mt-3 text-sm text-amber-300">
                  <span className="mr-2 text-slate-500">Reason:</span>
                  {log.reason}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

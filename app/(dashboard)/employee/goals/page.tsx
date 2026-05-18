import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/goals/StatusBadge'
import { WeightageBar } from '@/components/goals/WeightageBar'
import { Plus, Target, ChevronRight, Lock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { GoalStatus } from '@prisma/client'

export const metadata = {
  title: 'My Goal Sheets - GoalSphere',
}

export default async function EmployeeGoalsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const sheets = await prisma.goalSheet.findMany({
    where: { employeeId: session.user.id },
    include: {
      cycle: { select: { id: true, name: true, isActive: true } },
      manager: { select: { id: true, name: true } },
      goals: { select: { id: true, weightage: true, title: true } },
      _count: { select: { goals: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const isLocked = (status: GoalStatus) => status === 'APPROVED' || status === 'LOCKED'

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Goal Sheets</h1>
          <p className="page-subtitle">
            Welcome back, {session.user.name}. Manage your goals for the active cycle.
          </p>
        </div>
        <Link
          href="/employee/goals/new"
          className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--accent-gradient)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)]"
        >
          <Plus className="h-4 w-4" />
          New Goal Sheet
        </Link>
      </div>

      {sheets.length === 0 && (
        <div className="glass-panel glass-border flex flex-col items-center justify-center rounded-3xl py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-500/20 bg-violet-500/10">
            <Target className="h-8 w-8 text-violet-300" />
          </div>
          <h3 className="text-lg font-semibold text-white">No goal sheets yet</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Create your first goal sheet for the current cycle, define weightages, and submit it for approval.
          </p>
          <Link
            href="/employee/goals/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[image:var(--accent-gradient)] px-5 py-2.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Create Goal Sheet
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {sheets.map((sheet) => {
          const total = sheet.goals.reduce((sum, g) => sum + g.weightage, 0)
          const locked = isLocked(sheet.status as GoalStatus)
          const needsAttention = sheet.status === 'RETURNED'

          return (
            <Link
              key={sheet.id}
              href={`/employee/goals/${sheet.id}`}
              className={`glass-panel glass-panel-hover block rounded-3xl p-5 ${
                needsAttention ? 'border-amber-500/20' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${
                    locked
                      ? 'border-violet-500/20 bg-violet-500/10'
                      : needsAttention
                        ? 'border-amber-500/20 bg-amber-500/10'
                        : 'border-white/8 bg-white/[0.03]'
                  }`}
                >
                  {locked ? (
                    <Lock className="h-5 w-5 text-violet-300" />
                  ) : needsAttention ? (
                    <AlertTriangle className="h-5 w-5 text-amber-300" />
                  ) : (
                    <Target className="h-5 w-5 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{sheet.cycle.name}</h3>
                    <StatusBadge status={sheet.status as GoalStatus} />
                    {sheet.cycle.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>{sheet._count.goals} goal{sheet._count.goals !== 1 ? 's' : ''}</span>
                    {sheet.manager && <span>Manager: {sheet.manager.name}</span>}
                    {sheet.submittedAt && (
                      <span>
                        Submitted {new Date(sheet.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>

                  <WeightageBar total={total} className="max-w-sm" />

                  {sheet.status === 'RETURNED' && (
                    <p className="mt-3 text-xs font-medium text-amber-300">
                      Returned for revision - update your goals and resubmit.
                    </p>
                  )}
                </div>

                <ChevronRight className="mt-1 h-5 w-5 flex-shrink-0 text-slate-600 transition-colors group-hover:text-slate-300" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

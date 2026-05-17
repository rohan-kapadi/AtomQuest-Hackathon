import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/goals/StatusBadge'
import { WeightageBar } from '@/components/goals/WeightageBar'
import { ClipboardList, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import type { GoalStatus } from '@prisma/client'

export const metadata = { title: 'Pending Approvals - AtomQuest' }

export default async function ManagerApprovalsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'EMPLOYEE') redirect('/employee/goals')

  const sheets = await prisma.goalSheet.findMany({
    where: {
      managerId: session.user.id,
      status: 'SUBMITTED',
    },
    include: {
      cycle: { select: { name: true, isActive: true } },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      goals: { select: { id: true, weightage: true, title: true } },
      _count: { select: { goals: true } },
    },
    orderBy: { submittedAt: 'asc' },
  })

  const recentSheets = await prisma.goalSheet.findMany({
    where: {
      managerId: session.user.id,
      status: { in: ['APPROVED', 'RETURNED'] },
      updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    include: {
      cycle: { select: { name: true } },
      employee: { select: { id: true, name: true } },
      goals: { select: { id: true, weightage: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  })

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pending Approvals</h1>
          <p className="page-subtitle">
            Review, refine, and lock your team’s goal sheets.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Awaiting Review', value: sheets.length, tone: 'text-amber-300' },
          { label: 'Team Members', value: new Set(sheets.map((s) => s.employeeId)).size, tone: 'text-blue-300' },
          { label: 'Recently Actioned', value: recentSheets.length, tone: 'text-emerald-300' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-3xl p-5">
            <p className={`metric-number text-3xl ${stat.tone}`}>{stat.value}</p>
            <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          Awaiting Your Review
        </h2>

        {sheets.length === 0 ? (
          <div className="glass-panel glass-border flex flex-col items-center justify-center rounded-3xl py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <ClipboardList className="h-7 w-7 text-emerald-300" />
            </div>
            <h3 className="text-base font-semibold text-white">All caught up</h3>
            <p className="mt-2 text-sm text-slate-500">No pending submissions from your team.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sheets.map((sheet) => {
              const total = sheet.goals.reduce((sum, g) => sum + g.weightage, 0)
              const waitDays = sheet.submittedAt
                ? Math.floor((Date.now() - new Date(sheet.submittedAt).getTime()) / 86400000)
                : 0
              const isUrgent = waitDays >= 2

              return (
                <Link
                  key={sheet.id}
                  href={`/manager/approvals/${sheet.id}`}
                  className="glass-panel glass-panel-hover block rounded-3xl p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[image:var(--accent-gradient)] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.3)]">
                      {initials(sheet.employee.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{sheet.employee.name}</span>
                        {sheet.employee.department?.name && (
                          <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-xs text-slate-400">
                            {sheet.employee.department.name}
                          </span>
                        )}
                        <StatusBadge status="SUBMITTED" />
                        {isUrgent && (
                          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300">
                            {waitDays}d waiting
                          </span>
                        )}
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{sheet.cycle.name}</span>
                        <span>{sheet._count.goals} goals</span>
                        {sheet.submittedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Submitted {new Date(sheet.submittedAt).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short',
                            })}
                          </span>
                        )}
                      </div>

                      <WeightageBar total={total} className="max-w-sm" />
                    </div>

                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-600" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {recentSheets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Recently Actioned
          </h2>
          <div className="space-y-3">
            {recentSheets.map((sheet) => (
              <Link
                key={sheet.id}
                href={`/manager/approvals/${sheet.id}`}
                className="glass-panel glass-panel-hover flex items-center gap-4 rounded-2xl px-4 py-4"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-xs font-semibold text-white">
                  {initials(sheet.employee.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{sheet.employee.name}</span>
                    <StatusBadge status={sheet.status as GoalStatus} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{sheet.cycle.name}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

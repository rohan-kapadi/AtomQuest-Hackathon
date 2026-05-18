import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/goals/StatusBadge'
import { WeightageBar } from '@/components/goals/WeightageBar'
import { Users, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import type { GoalStatus } from '@prisma/client'

export const metadata = { title: 'My Team - GoalSphere' }

export default async function ManagerTeamPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'EMPLOYEE') redirect('/employee/goals')

  const reports = await prisma.user.findMany({
    where: { managerId: session.user.id },
    include: {
      goalSheets: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          cycle: { select: { name: true, isActive: true } },
          goals: { select: { weightage: true } },
          _count: { select: { goals: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const pendingCount = reports.filter(
    (r) => r.goalSheets[0]?.status === 'SUBMITTED'
  ).length

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Team</h1>
          <p className="page-subtitle">
            {reports.length} direct report{reports.length !== 1 ? 's' : ''}
            {pendingCount > 0 && ` · ${pendingCount} pending approval${pendingCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        {pendingCount > 0 && (
          <Link
            href="/manager/approvals"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300"
          >
            <Clock className="h-4 w-4" />
            Review Pending ({pendingCount})
          </Link>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="glass-panel glass-border flex flex-col items-center justify-center rounded-3xl py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
            <Users className="h-7 w-7 text-blue-300" />
          </div>
          <h3 className="text-base font-semibold text-white">No team members yet</h3>
          <p className="mt-2 text-sm text-slate-500">Ask your admin to assign employees to your reporting line.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((employee) => {
            const sheet = employee.goalSheets[0]
            const total = sheet?.goals.reduce((sum, g) => sum + g.weightage, 0) ?? 0

            return (
              <div
                key={employee.id}
                className="glass-panel glass-border rounded-3xl p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[image:var(--accent-gradient)] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(124,58,237,0.3)]">
                    {initials(employee.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{employee.name}</span>
                      {sheet && <StatusBadge status={sheet.status as GoalStatus} />}
                      {!sheet && (
                        <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-400">
                          No sheet
                        </span>
                      )}
                    </div>
                    <p className="mb-3 text-xs text-slate-500">{employee.email}</p>
                    {sheet && (
                      <>
                        <p className="mb-3 text-xs text-slate-500">{sheet.cycle.name}</p>
                        <WeightageBar total={total} className="max-w-xs" />
                      </>
                    )}
                  </div>

                  {sheet?.status === 'SUBMITTED' && (
                    <Link
                      href={`/manager/approvals/${sheet.id}`}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300"
                    >
                      Review <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

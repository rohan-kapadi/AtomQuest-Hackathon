import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApprovalActions } from '@/components/goals/ApprovalActions'
import { StatusBadge } from '@/components/goals/StatusBadge'
import { UnlockButton } from '@/components/goals/UnlockButton'
import { ArrowLeft, Calendar, Building2, Lock, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import type { GoalStatus } from '@prisma/client'

export const metadata = { title: 'Review Goal Sheet — AtomQuest' }

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'EMPLOYEE') redirect('/employee/goals')

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: {
        select: {
          id: true, name: true, email: true,
          department: { select: { name: true } },
        },
      },
      manager: { select: { id: true, name: true } },
      goals: { orderBy: { order: 'asc' } },
      checkins: {
        include: { manager: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!sheet) notFound()

  // Access control: assigned manager or admin
  const isAssignedManager = sheet.managerId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isAssignedManager && !isAdmin) redirect('/manager/approvals')

  const isAlreadyActioned = sheet.status === 'APPROVED' || sheet.status === 'RETURNED' || sheet.status === 'LOCKED'
  const totalWeightage = sheet.goals.reduce((sum, g) => sum + g.weightage, 0)

  const initials = sheet.employee.name
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back nav */}
      <div>
        <Link
          href="/manager/approvals"
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Approvals
        </Link>

        {/* Employee profile header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-violet-500/20 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{sheet.employee.name}</h1>
              <StatusBadge status={sheet.status as GoalStatus} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {sheet.employee.department?.name && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {sheet.employee.department.name}
                </span>
              )}
              <span>{sheet.employee.email}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {sheet.cycle.name}
              </span>
              {sheet.submittedAt && (
                <span>
                  Submitted {new Date(sheet.submittedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Already actioned notice + admin actions */}
      {isAlreadyActioned && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm flex-wrap ${
          sheet.status === 'APPROVED' || sheet.status === 'LOCKED'
            ? 'bg-violet-500/10 border-violet-500/20 text-violet-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        }`}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <p>
              {sheet.status === 'APPROVED' || sheet.status === 'LOCKED'
                ? 'This goal sheet has been approved and is now locked.'
                : 'This sheet was returned for revision. The employee will resubmit after making changes.'}
            </p>
          </div>
          {/* Admin-only actions on locked sheets */}
          {isAdmin && (sheet.status === 'APPROVED' || sheet.status === 'LOCKED') && (
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/employee/goals/${id}/checkin`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs rounded-xl transition-all"
              >
                <ClipboardCheck className="w-3.5 h-3.5" /> View Check-ins
              </Link>
              <UnlockButton sheetId={id} employeeName={sheet.employee.name} />
            </div>
          )}
        </div>
      )}

      {/* Check-in / return comments — shown at top so manager sees context */}
      {sheet.checkins.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            History
          </h2>
          {sheet.checkins.map((c) => (
            <div key={c.id} className="border-l-2 border-gray-700 pl-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                <span className="font-medium text-gray-400">{c.manager.name}</span>
                <span>·</span>
                <span>{c.quarter}</span>
                <span>·</span>
                <span>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
              <p className="text-sm text-gray-300">{c.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* If still SUBMITTED — show the interactive approval panel */}
      {sheet.status === 'SUBMITTED' ? (
        <ApprovalActions
          sheetId={id}
          initialGoals={sheet.goals}
          initialTotal={totalWeightage}
          employeeName={sheet.employee.name}
        />
      ) : (
        /* Read-only goal list for already-actioned sheets */
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Goals</h2>
          {sheet.goals.map((goal, idx) => (
            <div key={goal.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{goal.thrustArea}</p>
                  <p className="font-medium text-white text-sm">{goal.title}</p>
                  {goal.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="text-gray-600">{goal.uomType.replace('_', ' ')}</span>
                    {goal.target !== null && (
                      <span className="text-gray-400">Target: {goal.target.toLocaleString('en-IN')}</span>
                    )}
                    {goal.targetDate && (
                      <span className="text-gray-400">
                        By {new Date(goal.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-white tabular-nums flex-shrink-0">
                  {goal.weightage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

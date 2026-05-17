import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/goals/StatusBadge'
import { WeightageBar } from '@/components/goals/WeightageBar'
import { ArrowLeft, Lock, Send, FileEdit, Info, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import type { GoalStatus, UoMType } from '@prisma/client'
import { SubmitButton } from '@/components/goals/SubmitButton'

const UOM_LABELS: Record<UoMType, string> = {
  NUMERIC_MIN: 'Numeric (Higher = Better)',
  NUMERIC_MAX: 'Numeric (Lower = Better)',
  TIMELINE: 'Timeline / Milestone',
  ZERO: 'Zero Incidents',
}

export default async function GoalSheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: { select: { id: true, name: true, email: true } },
      manager: { select: { id: true, name: true } },
      goals: { orderBy: { order: 'asc' } },
      checkins: {
        include: { manager: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!sheet) notFound()

  // Only owner, their manager, or admin can view
  const isOwner = sheet.employeeId === session.user.id
  const isManager = sheet.managerId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'

  if (!isOwner && !isManager && !isAdmin) {
    redirect('/employee/goals')
  }

  const totalWeightage = sheet.goals.reduce((sum, g) => sum + g.weightage, 0)
  const isLocked = sheet.status === 'APPROVED' || sheet.status === 'LOCKED'
  const canEdit = isOwner && (sheet.status === 'DRAFT' || sheet.status === 'RETURNED')
  const canSubmit = isOwner && (sheet.status === 'DRAFT' || sheet.status === 'RETURNED')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/employee/goals"
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Goal Sheets
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{sheet.cycle.name}</h1>
              <StatusBadge status={sheet.status as GoalStatus} />
            </div>
            <p className="text-gray-400 text-sm">
              {sheet.employee.name} · Manager: {sheet.manager?.name ?? 'Not assigned'}
            </p>
          </div>

          {canEdit && (
            <Link
              href={`/employee/goals/${id}/edit`}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 text-sm rounded-xl transition-all"
            >
              <FileEdit className="w-4 h-4" />
              Edit Goals
            </Link>
          )}
          {isLocked && isOwner && (
            <Link
              href={`/employee/goals/${id}/checkin`}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-sm rounded-xl transition-all"
            >
              <ClipboardCheck className="w-4 h-4" />
              Quarterly Check-in
            </Link>
          )}
        </div>
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="flex items-center gap-3 px-4 py-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <Lock className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <p className="text-sm text-violet-300">
            This goal sheet is <strong>locked</strong> and cannot be edited.
            {isAdmin && ' As Admin, you can unlock it from the audit trail page.'}
          </p>
        </div>
      )}

      {/* Returned notice */}
      {sheet.status === 'RETURNED' && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-300 font-medium">Returned for revision</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Please update your goals and resubmit for approval.
            </p>
          </div>
        </div>
      )}

      {/* Weightage summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <WeightageBar total={totalWeightage} />
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{sheet.goals.length} goal{sheet.goals.length !== 1 ? 's' : ''}</span>
          <span>
            {sheet.submittedAt &&
              `Submitted ${new Date(sheet.submittedAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}`}
            {sheet.approvedAt &&
              ` · Approved ${new Date(sheet.approvedAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
              })}`}
          </span>
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-3">
        {sheet.goals.map((goal, idx) => (
          <div
            key={goal.id}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            {/* Goal header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-violet-400">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">{goal.thrustArea}</p>
                <h3 className="font-semibold text-white text-sm leading-snug">{goal.title}</h3>
              </div>
              <span className="flex-shrink-0 text-sm font-bold text-white tabular-nums">
                {goal.weightage}%
              </span>
            </div>

            {goal.description && (
              <p className="text-xs text-gray-500 mb-4 pl-10">{goal.description}</p>
            )}

            {/* Details row */}
            <div className="pl-10 flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-gray-600">Measurement</span>
                <p className="text-gray-300 font-medium mt-0.5">
                  {UOM_LABELS[goal.uomType as UoMType]}
                </p>
              </div>
              {goal.target !== null && (
                <div>
                  <span className="text-gray-600">Target</span>
                  <p className="text-gray-300 font-medium mt-0.5">
                    {goal.target.toLocaleString('en-IN')}
                  </p>
                </div>
              )}
              {goal.targetDate && (
                <div>
                  <span className="text-gray-600">Target Date</span>
                  <p className="text-gray-300 font-medium mt-0.5">
                    {new Date(goal.targetDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {goal.isShared && (
                <div>
                  <span className="text-xs px-1.5 py-0.5 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-full">
                    Shared Goal
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Manager check-in comments */}
      {sheet.checkins.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300">Manager Check-in Comments</h2>
          {sheet.checkins.map((checkin) => (
            <div key={checkin.id} className="border-l-2 border-violet-500/40 pl-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-violet-400">{checkin.quarter}</span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-500">{checkin.manager.name}</span>
                <span className="text-xs text-gray-600">·</span>
                <span className="text-xs text-gray-600">
                  {new Date(checkin.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short',
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-300">{checkin.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Submit for approval button */}
      {canSubmit && (
        <SubmitButton
          sheetId={id}
          totalWeightage={totalWeightage}
          goalCount={sheet.goals.length}
        />
      )}
    </div>
  )
}

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CheckinForm } from '@/components/checkins/CheckinForm'
import { ProgressScore } from '@/components/goals/ProgressScore'
import { ArrowLeft, Lock, Clock } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Quarterly Check-in — AtomQuest' }

export default async function CheckinPage({
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
      cycle: { select: { name: true } },
      employee: { select: { id: true, name: true } },
      goals: {
        orderBy: { order: 'asc' },
        include: {
          achievements: { orderBy: { quarter: 'asc' } },
        },
      },
    },
  })

  if (!sheet) redirect('/employee/goals')

  // Only the owner can do check-in
  if (sheet.employeeId !== session.user.id) redirect('/employee/goals')

  // Can only check in if APPROVED or LOCKED
  if (sheet.status !== 'APPROVED' && sheet.status !== 'LOCKED') {
    redirect(`/employee/goals/${id}`)
  }

  const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

  // Compute overall weighted score across all goals and quarters
  const overallByQuarter = QUARTERS.map(q => {
    let weightedSum = 0
    let totalWeight = 0
    for (const goal of sheet.goals) {
      const achievement = goal.achievements.find(a => a.quarter === q)
      if (achievement?.progressScore != null) {
        weightedSum += (achievement.progressScore * goal.weightage)
        totalWeight += goal.weightage
      }
    }
    return {
      quarter: q,
      score: totalWeight > 0 ? weightedSum / totalWeight : null,
    }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/employee/goals/${id}`}
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Goal Sheet
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Quarterly Check-in
              {sheet.status === 'LOCKED' && <Lock className="w-5 h-5 text-amber-400" />}
            </h1>
            <p className="text-gray-400 mt-1 text-sm">{sheet.cycle.name} · {sheet.employee.name}</p>
          </div>
          {/* Overall scores by quarter */}
          <div className="flex gap-3 flex-wrap">
            {overallByQuarter.map(({ quarter, score }) => (
              <div key={quarter} className="text-center">
                <p className="text-xs text-gray-500 mb-1">{quarter} Overall</p>
                {score !== null ? (
                  <ProgressScore score={score} size="sm" />
                ) : (
                  <span className="text-xs text-gray-700 px-2 py-1 bg-gray-800 rounded-lg border border-gray-700">
                    No data
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Check-in note */}
      <div className="flex items-center gap-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-sm text-blue-300">
        <Clock className="w-4 h-4 flex-shrink-0" />
        Log your actual achievements per quarter below. Scores are computed automatically based on your goal targets.
        Shared goals (marked with a badge) will sync to all copies automatically.
      </div>

      {/* Goals with check-in forms */}
      <div className="space-y-4">
        {sheet.goals.map(goal => {
          const latestScore = goal.achievements.length > 0
            ? Math.max(...goal.achievements.map(a => a.progressScore ?? 0))
            : null

          return (
            <div key={goal.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {/* Goal header */}
              <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-gray-400">
                      {goal.thrustArea}
                    </span>
                    {goal.isShared && (
                      <span className="text-xs px-2 py-0.5 bg-violet-500/15 border border-violet-500/30 rounded-full text-violet-300">
                        Shared
                      </span>
                    )}
                    <span className="text-xs text-gray-600">{goal.weightage}% weight</span>
                  </div>
                  <h3 className="text-white font-semibold leading-snug">{goal.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {goal.uomType === 'NUMERIC_MIN' && `Target: ${goal.target?.toLocaleString()} (Higher is better)`}
                    {goal.uomType === 'NUMERIC_MAX' && `Target: ${goal.target?.toLocaleString()} (Lower is better)`}
                    {goal.uomType === 'TIMELINE' && `Target Date: ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('en-IN') : 'N/A'}`}
                    {goal.uomType === 'ZERO' && 'Zero incidents goal'}
                  </p>
                </div>
                {latestScore !== null && (
                  <ProgressScore score={latestScore} size="sm" />
                )}
              </div>

              {/* Check-in form */}
              <div className="p-5">
                <CheckinForm
                  goal={{
                    id: goal.id,
                    title: goal.title,
                    thrustArea: goal.thrustArea,
                    uomType: goal.uomType,
                    target: goal.target,
                    targetDate: goal.targetDate?.toISOString() ?? null,
                    weightage: goal.weightage,
                    isReadOnly: goal.isReadOnly,
                  }}
                  existingAchievements={goal.achievements.map(a => ({
                    quarter: a.quarter,
                    status: a.status,
                    actualValue: a.actualValue,
                    actualDate: a.actualDate?.toISOString() ?? null,
                    isZeroAchieved: a.isZeroAchieved,
                    notes: a.notes,
                    progressScore: a.progressScore,
                  }))}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

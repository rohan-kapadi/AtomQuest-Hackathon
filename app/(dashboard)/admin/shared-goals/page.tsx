import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SharedGoalForm } from '@/components/goals/SharedGoalForm'
import { Users, Share2, CheckCircle2 } from 'lucide-react'
import type { GoalStatus } from '@prisma/client'

export const metadata = { title: 'Push Shared Goal — AtomQuest' }

export default async function SharedGoalsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'EMPLOYEE') redirect('/employee/goals')

  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } })

  // All employees / managers who can receive shared goals
  const employees = await prisma.user.findMany({
    where: { role: { in: ['EMPLOYEE', 'MANAGER'] } },
    select: {
      id: true, name: true, email: true, role: true,
      department: { select: { name: true } },
      goalSheets: cycle
        ? {
            where: { cycleId: cycle.id },
            select: { id: true, status: true, goals: { where: { isShared: true }, select: { id: true, title: true } } },
          }
        : false,
    },
    orderBy: { name: 'asc' },
  })

  // Already-pushed shared goals this cycle
  const existingShared = cycle
    ? await prisma.goal.findMany({
        where: {
          isShared: true,
          sharedFromId: null,
          goalSheet: { cycleId: cycle.id },
        },
        include: {
          goalSheet: {
            include: { employee: { select: { id: true, name: true } } },
          },
          sharedCopies: {
            include: {
              goalSheet: {
                include: { employee: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-violet-400" />
          </div>
          Push Shared Goal
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Define a goal template and push it to selected employees. Recipients can only adjust their weightage.
        </p>
      </div>

      {!cycle && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-amber-300 text-sm">
          No active goal cycle. Please activate a cycle before pushing shared goals.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form — takes 2/3 */}
        <div className="lg:col-span-2">
          <SharedGoalForm
            employees={employees as any}
            cycleId={cycle?.id ?? ''}
            disabled={!cycle}
          />
        </div>

        {/* Previous pushes sidebar */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Previously Pushed
          </h2>
          {existingShared.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <Share2 className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">No shared goals pushed yet this cycle.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {existingShared.map((g) => (
                <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{g.thrustArea}</p>
                  <p className="text-sm font-medium text-white mb-2 leading-snug">{g.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-300">
                      <CheckCircle2 className="w-3 h-3" />
                      {g.goalSheet.employee.name} (primary)
                    </div>
                    {g.sharedCopies.map((copy) => (
                      <div key={copy.id} className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        {copy.goalSheet.employee.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

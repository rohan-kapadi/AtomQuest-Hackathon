import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ManagerCheckinPanel } from '@/components/checkins/ManagerCheckinPanel'
import { Users, ClipboardCheck } from 'lucide-react'

export const metadata = { title: 'Team Check-ins — GoalSphere' }

export default async function ManagerCheckinsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role === 'EMPLOYEE') redirect('/employee/goals')

  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } })

  // Fetch all direct reports (or all employees if admin)
  const reportIds = session.user.role === 'ADMIN'
    ? (await prisma.user.findMany({ where: { role: { in: ['EMPLOYEE', 'MANAGER'] } }, select: { id: true } })).map(u => u.id)
    : (await prisma.user.findMany({ where: { managerId: session.user.id }, select: { id: true } })).map(u => u.id)

  const sheets = cycle ? await prisma.goalSheet.findMany({
    where: {
      cycleId: cycle.id,
      employeeId: { in: reportIds },
      status: { in: ['APPROVED', 'LOCKED'] },
    },
    include: {
      employee: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
      goals: {
        orderBy: { order: 'asc' },
        include: { achievements: { orderBy: { quarter: 'asc' } } },
      },
      checkins: {
        include: { manager: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  }) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-blue-400" />
          </div>
          Team Check-ins
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Review planned vs actual progress and add quarterly check-in comments.
        </p>
      </div>

      {!cycle && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-amber-300 text-sm">
          No active goal cycle found.
        </div>
      )}

      {sheets.length === 0 && cycle && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No approved goal sheets yet.</p>
          <p className="text-gray-600 text-sm mt-1">
            Team members' sheets will appear here once you approve them.
          </p>
        </div>
      )}

      {/* One card per team member */}
      <div className="space-y-6">
        {sheets.map(sheet => (
          <ManagerCheckinPanel
            key={sheet.id}
            sheet={{
              id: sheet.id,
              status: sheet.status,
              employee: sheet.employee,
              goals: sheet.goals.map(g => ({
                id: g.id,
                title: g.title,
                thrustArea: g.thrustArea,
                uomType: g.uomType,
                target: g.target,
                targetDate: g.targetDate?.toISOString() ?? null,
                weightage: g.weightage,
                achievements: g.achievements.map(a => ({
                  quarter: a.quarter,
                  status: a.status,
                  actualValue: a.actualValue,
                  actualDate: a.actualDate?.toISOString() ?? null,
                  isZeroAchieved: a.isZeroAchieved,
                  progressScore: a.progressScore,
                  notes: a.notes,
                })),
              })),
              checkins: sheet.checkins.map(c => ({
                id: c.id,
                quarter: c.quarter,
                comment: c.comment,
                createdAt: c.createdAt.toISOString(),
                manager: c.manager,
              })),
            }}
          />
        ))}
      </div>
    </div>
  )
}

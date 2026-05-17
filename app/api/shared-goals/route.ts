import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { SharedGoalPushSchema } from '@/lib/validations'

// POST /api/shared-goals — Admin/Manager pushes a goal template to multiple employees
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden — managers and admins only' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = SharedGoalPushSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: `${first.path.join('.')}: ${first.message}` }, { status: 422 })
  }

  const { employeeIds, goal } = parsed.data

  if (employeeIds.length < 1) {
    return NextResponse.json({ error: 'Select at least one employee' }, { status: 400 })
  }

  // Get the active cycle
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } })
  if (!cycle) {
    return NextResponse.json({ error: 'No active goal cycle found' }, { status: 400 })
  }

  // Verify all employees exist
  const employees = await prisma.user.findMany({
    where: { id: { in: employeeIds }, role: { in: ['EMPLOYEE', 'MANAGER'] } },
    select: { id: true, name: true, managerId: true },
  })

  if (employees.length === 0) {
    return NextResponse.json({ error: 'No valid employees found' }, { status: 400 })
  }

  const results: Array<{ employeeId: string; goalId: string; isPrimary: boolean; sheetId: string }> = []

  // Process in a transaction: find/create sheets, create goals
  await prisma.$transaction(async (tx) => {
    let primaryGoalId: string | null = null

    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i]
      const isPrimary = i === 0

      // Find existing sheet or create one
      let sheet = await tx.goalSheet.findFirst({
        where: { employeeId: employee.id, cycleId: cycle.id },
      })

      if (!sheet) {
        sheet = await tx.goalSheet.create({
          data: {
            cycleId: cycle.id,
            employeeId: employee.id,
            managerId: employee.managerId ?? null,
            status: 'DRAFT',
            totalWeightage: 0,
          },
        })
      }

      // Don't add to locked/approved sheets
      if (sheet.status === 'APPROVED' || sheet.status === 'LOCKED') {
        continue
      }

      // Create the goal on this sheet
      const createdGoal: { id: string } = await tx.goal.create({
        data: {
          goalSheetId: sheet.id,
          thrustArea: goal.thrustArea,
          title: goal.title,
          description: goal.description ?? null,
          uomType: goal.uomType,
          target: goal.target ?? null,
          targetDate: goal.targetDate ? new Date(goal.targetDate as unknown as string) : null,
          weightage: goal.weightage,
          isShared: true,
          isReadOnly: !isPrimary,
          sharedFromId: isPrimary ? null : primaryGoalId,
          order: 999,
        },
      })

      if (isPrimary) primaryGoalId = createdGoal.id

      // Update total weightage on the sheet
      const updatedTotal = await tx.goal.aggregate({
        where: { goalSheetId: sheet.id },
        _sum: { weightage: true },
      })
      await tx.goalSheet.update({
        where: { id: sheet.id },
        data: { totalWeightage: updatedTotal._sum.weightage ?? 0 },
      })

      results.push({ employeeId: employee.id, goalId: createdGoal.id, isPrimary, sheetId: sheet.id })
    }
  })

  // Audit log AFTER transaction commits (avoids FK violation inside tx)
  const primaryResult = results.find(r => r.isPrimary)
  if (primaryResult) {
    await createAuditLog({
      goalSheetId: primaryResult.sheetId,
      userId: session.user.id,
      action: AuditActions.SHARED_GOAL_PUSHED,
      newValue: {
        title: goal.title,
        recipients: employees.map(e => e.name),
      },
    }).catch(() => { /* Non-critical — don't fail the request if audit log fails */ })
  }

  return NextResponse.json({
    message: `Shared goal pushed to ${results.length} employee(s)`,
    results,
  }, { status: 201 })
}

// GET /api/shared-goals — list shared goals pushed this cycle
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } })
  if (!cycle) return NextResponse.json({ sharedGoals: [] })

  // Find all "primary" shared goals for this cycle
  const sharedGoals = await prisma.goal.findMany({
    where: {
      isShared: true,
      sharedFromId: null, // Primary goals only
      goalSheet: { cycleId: cycle.id },
    },
    include: {
      goalSheet: {
        include: {
          employee: { select: { id: true, name: true, email: true } },
        },
      },
      sharedCopies: {
        include: {
          goalSheet: {
            include: {
              employee: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ sharedGoals })
}

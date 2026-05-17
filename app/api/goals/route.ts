import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoalSheetCreateSchema } from '@/lib/validations'
import { logAudit } from '@/lib/audit'

// GET /api/goals — list the current user's goal sheets
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sheets = await prisma.goalSheet.findMany({
    where: { employeeId: session.user.id },
    include: {
      cycle: { select: { id: true, name: true, isActive: true } },
      manager: { select: { id: true, name: true } },
      goals: {
        orderBy: { order: 'asc' },
      },
      _count: { select: { goals: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ sheets })
}

// POST /api/goals — create a new goal sheet with goals
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Server-side validation
  const parsed = GoalSheetCreateSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const path = firstIssue.path.join('.')
    const humanError = path ? `${path}: ${firstIssue.message}` : firstIssue.message
    return NextResponse.json(
      { error: humanError, issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { cycleId, goals } = parsed.data

  // Verify cycle exists and is active
  const cycle = await prisma.goalCycle.findUnique({ where: { id: cycleId } })
  if (!cycle) {
    return NextResponse.json({ error: 'Goal cycle not found' }, { status: 404 })
  }
  if (!cycle.isActive) {
    return NextResponse.json({ error: 'This goal cycle is not active' }, { status: 400 })
  }

  // Check for existing sheet in this cycle for this employee
  const existing = await prisma.goalSheet.findFirst({
    where: { employeeId: session.user.id, cycleId },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'You already have a goal sheet for this cycle', sheetId: existing.id },
      { status: 409 }
    )
  }

  // Find the user's manager
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { managerId: true },
  })

  // Create sheet + goals in a transaction
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)

  const sheet = await prisma.goalSheet.create({
    data: {
      cycleId,
      employeeId: session.user.id,
      managerId: user?.managerId ?? null,
      status: 'DRAFT',
      totalWeightage,
      goals: {
        create: goals.map((g, idx) => ({
          thrustArea: g.thrustArea,
          title: g.title,
          description: g.description ?? null,
          uomType: g.uomType,
          target: g.target ?? null,
          targetDate: g.targetDate ?? null,
          weightage: g.weightage,
          order: idx,
        })),
      },
    },
    include: {
      goals: { orderBy: { order: 'asc' } },
      cycle: true,
    },
  })

  return NextResponse.json({ sheet }, { status: 201 })
}

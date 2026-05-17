import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AchievementSchema } from '@/lib/validations'
import { calculateScore } from '@/lib/score-calculator'

// GET /api/goals/[id]/achievements — list achievements for a goal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      goalSheet: {
        select: { employeeId: true, managerId: true, status: true },
      },
      achievements: { orderBy: { quarter: 'asc' } },
    },
  })

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = goal.goalSheet.employeeId === session.user.id
  const isManager = goal.goalSheet.managerId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'

  if (!isOwner && !isManager && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ achievements: goal.achievements })
}

// POST /api/goals/[id]/achievements — log/update achievement for this goal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      goalSheet: { select: { employeeId: true, status: true } },
      sharedCopies: true, // If primary owner, these are the linked copies
    },
  })

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only the owner can log achievements
  if (goal.goalSheet.employeeId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — only goal owner can log achievements' }, { status: 403 })
  }

  // Sheet must be APPROVED/LOCKED
  if (goal.goalSheet.status !== 'APPROVED' && goal.goalSheet.status !== 'LOCKED') {
    return NextResponse.json(
      { error: 'Achievements can only be logged on approved goal sheets' },
      { status: 400 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = AchievementSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: `${first.path.join('.')}: ${first.message}` }, { status: 422 })
  }

  const { quarter, status, actualValue, actualDate, isZeroAchieved, notes } = parsed.data

  // Compute progress score
  const progressScore = calculateScore(
    goal.uomType,
    goal.target,
    goal.targetDate,
    actualValue,
    actualDate,
    isZeroAchieved
  )

  const achievementData = {
    goalId: id,
    quarter,
    status,
    actualValue: actualValue ?? null,
    actualDate: actualDate ?? null,
    isZeroAchieved: isZeroAchieved ?? null,
    notes: notes ?? null,
    progressScore,
  }

  // Upsert (create or update) this quarter's achievement
  const achievement = await prisma.achievement.upsert({
    where: {
      // Unique constraint: goalId + quarter
      goalId_quarter: { goalId: id, quarter },
    },
    create: achievementData,
    update: {
      status,
      actualValue: actualValue ?? null,
      actualDate: actualDate ?? null,
      isZeroAchieved: isZeroAchieved ?? null,
      notes: notes ?? null,
      progressScore,
    },
  })

  // ─── Sync to shared copies (critical business rule from Section 6.3) ──────
  // If this is the primary goal (sharedFromId=null) and has copies, sync them
  if (!goal.sharedFromId && goal.sharedCopies.length > 0) {
    await Promise.all(
      goal.sharedCopies.map((copy) =>
        prisma.achievement.upsert({
          where: { goalId_quarter: { goalId: copy.id, quarter } },
          create: {
            goalId: copy.id,
            quarter,
            status,
            actualValue: actualValue ?? null,
            actualDate: actualDate ?? null,
            isZeroAchieved: isZeroAchieved ?? null,
            notes: notes ?? null,
            progressScore,
          },
          update: {
            status,
            actualValue: actualValue ?? null,
            actualDate: actualDate ?? null,
            isZeroAchieved: isZeroAchieved ?? null,
            notes: notes ?? null,
            progressScore,
          },
        })
      )
    )
  }

  return NextResponse.json({
    achievement,
    syncedCopies: goal.sharedCopies.length,
    progressScore: Math.min(progressScore * 100, 150).toFixed(1) + '%',
  }, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { UnlockGoalSchema } from '@/lib/validations'

// POST /api/goals/[id]/unlock — ADMIN only: requires reason, creates AuditLog, sets DRAFT
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — admins only can unlock goal sheets' }, { status: 403 })
  }

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    select: { id: true, status: true, employeeId: true },
  })
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  if (sheet.status !== 'APPROVED' && sheet.status !== 'LOCKED') {
    return NextResponse.json(
      { error: `Cannot unlock a sheet with status "${sheet.status}". Only APPROVED or LOCKED sheets can be unlocked.` },
      { status: 400 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = UnlockGoalSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first.message }, { status: 422 })
  }

  const { reason } = parsed.data
  const oldStatus = sheet.status

  // MANDATORY: create audit log BEFORE making the change (per Section 6.2)
  await createAuditLog({
    goalSheetId: id,
    userId: session.user.id,
    action: AuditActions.GOAL_UNLOCKED,
    fieldChanged: 'status',
    oldValue: oldStatus,
    newValue: 'DRAFT',
    reason,
  })

  // Set sheet back to DRAFT so employee can re-edit and re-submit
  const updated = await prisma.goalSheet.update({
    where: { id },
    data: {
      status: 'DRAFT',
      approvedAt: null,
      lockedAt: null,
      submittedAt: null,
    },
    include: {
      employee: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json({
    message: `Goal sheet unlocked. Employee must re-submit for approval.`,
    sheet: { id: updated.id, status: updated.status, employee: updated.employee },
  })
}

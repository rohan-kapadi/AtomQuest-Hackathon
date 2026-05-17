import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { ReturnGoalSchema } from '@/lib/validations'
import { sendReturnEmail } from '@/lib/email'

// POST /api/goals/[id]/return — manager returns sheet for rework with a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — only managers can return sheets' }, { status: 403 })
  }

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({ 
    where: { id },
    include: { employee: { select: { name: true, email: true } } }
  })
  if (!sheet) return NextResponse.json({ error: 'Goal sheet not found' }, { status: 404 })

  if (session.user.role === 'MANAGER' && sheet.managerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden — not your team member' }, { status: 403 })
  }

  if (sheet.status !== 'SUBMITTED') {
    return NextResponse.json(
      { error: `Cannot return a sheet with status "${sheet.status}". Sheet must be SUBMITTED.` },
      { status: 400 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = ReturnGoalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { comment } = parsed.data

  // Audit log BEFORE making the change
  await createAuditLog({
    goalSheetId: id,
    userId: session.user.id,
    action: AuditActions.GOAL_RETURNED,
    newValue: { status: 'RETURNED', comment },
  })

  // Set RETURNED status — employee can re-edit and resubmit
  const updated = await prisma.goalSheet.update({
    where: { id },
    data: { status: 'RETURNED' },
  })

  // Store the return comment as a check-in so employee can see it
  await prisma.checkin.create({
    data: {
      goalSheetId: id,
      managerId: session.user.id,
      quarter: 'Q1', // Return comments are not quarter-specific, Q1 as placeholder
      comment: `🔄 RETURNED FOR REVISION: ${comment}`,
    },
  })

  // Send notification to employee
  if (sheet.employee?.email) {
    await sendReturnEmail(sheet.employee.name, sheet.employee.email, id, comment)
  }

  return NextResponse.json({ sheet: updated })
}

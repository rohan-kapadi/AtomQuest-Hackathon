import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { sendApprovalEmail } from '@/lib/email'

// POST /api/goals/[id]/approve — manager approves & locks the goal sheet
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden — only managers can approve' }, { status: 403 })
  }

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    include: { 
      goals: true,
      employee: { select: { name: true, email: true } }
    },
  })

  if (!sheet) return NextResponse.json({ error: 'Goal sheet not found' }, { status: 404 })

  // Manager must be assigned to this sheet (or admin can approve any)
  if (session.user.role === 'MANAGER' && sheet.managerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden — not your team member' }, { status: 403 })
  }

  // Can only approve SUBMITTED sheets
  if (sheet.status !== 'SUBMITTED') {
    return NextResponse.json(
      { error: `Cannot approve a sheet with status "${sheet.status}". Sheet must be SUBMITTED.` },
      { status: 400 }
    )
  }

  // Re-validate 100% total weightage before approval (business rule 6.1)
  const total = sheet.goals.reduce((sum, g) => sum + g.weightage, 0)
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json(
      {
        error: `Cannot approve: total weightage is ${total.toFixed(1)}% (must be exactly 100%). Please adjust goals inline before approving.`,
      },
      { status: 422 }
    )
  }

  // Must have at least one goal
  if (sheet.goals.length === 0) {
    return NextResponse.json({ error: 'Cannot approve an empty goal sheet' }, { status: 400 })
  }

  const now = new Date()

  // Create audit log BEFORE making the change (per business rule 6.2)
  await createAuditLog({
    goalSheetId: id,
    userId: session.user.id,
    action: AuditActions.GOAL_APPROVED,
    newValue: { status: 'APPROVED', approvedAt: now, lockedAt: now },
  })

  // Approve and lock the sheet
  const updated = await prisma.goalSheet.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedAt: now,
      lockedAt: now,
    },
  })

  // Send notification to employee
  if (sheet.employee?.email) {
    await sendApprovalEmail(sheet.employee.name, sheet.employee.email, id)
  }

  return NextResponse.json({ sheet: updated })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { sendSubmissionEmail } from '@/lib/email'

// POST /api/goals/[id]/submit — validate 100% weightage and set SUBMITTED
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    include: { 
      goals: true,
      employee: { select: { name: true } },
      manager: { select: { email: true } },
    },
  })

  if (!sheet) {
    return NextResponse.json({ error: 'Goal sheet not found' }, { status: 404 })
  }

  // Only the owner can submit
  if (sheet.employeeId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Can only submit DRAFT or RETURNED sheets
  if (sheet.status !== 'DRAFT' && sheet.status !== 'RETURNED') {
    return NextResponse.json(
      { error: `Cannot submit a sheet with status "${sheet.status}"` },
      { status: 400 }
    )
  }

  // Must have at least 1 goal
  if (sheet.goals.length === 0) {
    return NextResponse.json({ error: 'Add at least one goal before submitting' }, { status: 400 })
  }

  // Enforce 100% total weightage — SERVER SIDE (not just client)
  const total = sheet.goals.reduce((sum, g) => sum + g.weightage, 0)
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json(
      {
        error: `Total weightage must equal 100% (currently ${total.toFixed(1)}%). Please adjust your goals.`,
      },
      { status: 422 }
    )
  }

  // Each goal must be at least 10%
  const underweight = sheet.goals.find((g) => g.weightage < 10)
  if (underweight) {
    return NextResponse.json(
      { error: `Goal "${underweight.title}" has less than 10% weightage` },
      { status: 422 }
    )
  }

  // All checks passed — update to SUBMITTED
  const updated = await prisma.goalSheet.update({
    where: { id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      totalWeightage: total,
    },
  })

  // Create audit log entry
  await logAudit({
    goalSheetId: id,
    userId: session.user.id,
    action: 'GOAL_SUBMITTED',
    newValue: JSON.stringify({ status: 'SUBMITTED', submittedAt: updated.submittedAt }),
  })

  // Send notification to manager
  if (sheet.manager?.email) {
    await sendSubmissionEmail(sheet.employee.name, sheet.manager.email, id)
  }

  return NextResponse.json({ sheet: updated })
}

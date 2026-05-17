import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit'
import { z } from 'zod'

// ─── GET /api/goals/[id] — fetch single sheet with all goals ─────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    include: {
      cycle: true,
      employee: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
      manager: { select: { id: true, name: true, email: true } },
      goals: { orderBy: { order: 'asc' } },
      checkins: {
        include: { manager: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: {
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { timestamp: 'desc' },
      },
    },
  })

  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access control: owner, their manager, or admin
  const isOwner = sheet.employeeId === session.user.id
  const isManager = sheet.managerId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'

  if (!isOwner && !isManager && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ sheet })
}

// ─── PUT /api/goals/[id] — manager inline edits goals (target + weightage) ───
const InlineEditSchema = z.object({
  goals: z.array(
    z.object({
      id: z.string(),
      target: z.number().nullable().optional(),
      targetDate: z.string().nullable().optional(),
      weightage: z.number().min(10, 'Min weightage is 10%').max(100),
    })
  ),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    include: { goals: true },
  })

  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = sheet.employeeId === session.user.id
  const isManager = session.user.role === 'MANAGER' || session.user.role === 'ADMIN'
  const isManagerAssigned = sheet.managerId === session.user.id || session.user.role === 'ADMIN'

  // EMPLOYEE editing their own DRAFT or RETURNED sheet
  if (isOwner && (sheet.status === 'DRAFT' || sheet.status === 'RETURNED')) {
    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const parsed = InlineEditSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
    }

    const { goals: edits } = parsed.data
    const updatedWeightages = new Map(edits.map((e) => [e.id, e.weightage]))
    const newTotal = sheet.goals.reduce((sum, g) => sum + (updatedWeightages.get(g.id) ?? g.weightage), 0)

    await prisma.$transaction(async (tx) => {
      for (const edit of edits) {
        const existing = sheet.goals.find((g) => g.id === edit.id)
        if (!existing) continue
        const updates: Record<string, unknown> = {}
        if (edit.weightage !== existing.weightage) updates.weightage = edit.weightage
        if (edit.target !== undefined && edit.target !== existing.target) updates.target = edit.target
        if (edit.targetDate !== undefined) {
          updates.targetDate = edit.targetDate ? new Date(edit.targetDate) : null
        }
        if (Object.keys(updates).length > 0) {
          await tx.goal.update({ where: { id: edit.id }, data: updates })
        }
      }
      await tx.goalSheet.update({ where: { id }, data: { totalWeightage: newTotal } })
    })

    const updated = await prisma.goalSheet.findUnique({
      where: { id },
      include: { goals: { orderBy: { order: 'asc' } } },
    })
    return NextResponse.json({ sheet: updated, totalWeightage: newTotal })
  }

  // MANAGER inline-editing a SUBMITTED sheet
  if (!isManager) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (sheet.status !== 'SUBMITTED') {
    return NextResponse.json({ error: `Cannot edit a sheet with status "${sheet.status}"` }, { status: 400 })
  }
  if (!isManagerAssigned) {
    return NextResponse.json({ error: 'Forbidden — not your team member' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = InlineEditSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 422 })
  }

  const { goals: edits } = parsed.data

  // Re-validate total weightage
  const updatedWeightages = new Map(edits.map((e) => [e.id, e.weightage]))
  const newTotal = sheet.goals.reduce((sum, g) => {
    return sum + (updatedWeightages.get(g.id) ?? g.weightage)
  }, 0)

  // Apply changes in a transaction, creating audit logs for each change
  await prisma.$transaction(async (tx) => {
    for (const edit of edits) {
      const existing = sheet.goals.find((g) => g.id === edit.id)
      if (!existing) continue

      const updates: Record<string, unknown> = {}
      if (edit.weightage !== undefined && edit.weightage !== existing.weightage) {
        await createAuditLog({
          goalSheetId: id,
          userId: session.user.id,
          action: AuditActions.WEIGHTAGE_CHANGED,
          fieldChanged: 'weightage',
          oldValue: existing.weightage,
          newValue: edit.weightage,
        })
        updates.weightage = edit.weightage
      }

      if (edit.target !== undefined && edit.target !== existing.target) {
        await createAuditLog({
          goalSheetId: id,
          userId: session.user.id,
          action: AuditActions.TARGET_CHANGED,
          fieldChanged: 'target',
          oldValue: existing.target,
          newValue: edit.target,
        })
        updates.target = edit.target
      }

      if (edit.targetDate !== undefined) {
        const newDate = edit.targetDate ? new Date(edit.targetDate) : null
        const oldDate = existing.targetDate?.toISOString() ?? null
        if (edit.targetDate !== oldDate) {
          updates.targetDate = newDate
        }
      }

      if (Object.keys(updates).length > 0) {
        await tx.goal.update({ where: { id: edit.id }, data: updates })
      }
    }

    // Update total on sheet
    await tx.goalSheet.update({ where: { id }, data: { totalWeightage: newTotal } })
  })

  // Re-fetch updated sheet
  const updated = await prisma.goalSheet.findUnique({
    where: { id },
    include: { goals: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json({ sheet: updated, totalWeightage: newTotal })
}

// ─── PATCH /api/goals/[id] — employee full-replace goals on DRAFT/RETURNED ───
const FullGoalEditSchema = z.object({
  goals: z.array(
    z.object({
      thrustArea: z.string().min(1, 'Thrust area is required'),
      title: z.string().min(1, 'Goal title is required'),
      description: z.string().optional().nullable(),
      uomType: z.enum(['NUMERIC_MIN', 'NUMERIC_MAX', 'TIMELINE', 'ZERO']),
      target: z.preprocess(
        (v) => { if (v === '' || v === undefined || v === null) return null; const n = Number(v); return isNaN(n) ? null : n },
        z.number().nullable().optional()
      ),
      targetDate: z.preprocess(
        (v) => { if (!v || v === '') return null; if (v instanceof Date) return v; const d = new Date(v as string); return isNaN(d.getTime()) ? null : d },
        z.date().nullable().optional()
      ),
      weightage: z.preprocess(
        (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n },
        z.number().min(10, 'Min 10%').max(100)
      ),
    })
  ).min(1).max(8),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const sheet = await prisma.goalSheet.findUnique({ where: { id } })
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Only the owner can do a full edit, and only on DRAFT/RETURNED
  if (sheet.employeeId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (sheet.status !== 'DRAFT' && sheet.status !== 'RETURNED') {
    return NextResponse.json(
      { error: `Cannot edit a sheet with status "${sheet.status}"` },
      { status: 400 }
    )
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = FullGoalEditSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: `${first.path.join('.')}: ${first.message}`, issues: parsed.error.issues }, { status: 422 })
  }

  const { goals } = parsed.data
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)

  // Replace all goals in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing goals
    await tx.goal.deleteMany({ where: { goalSheetId: id } })
    // Create new set of goals
    await tx.goal.createMany({
      data: goals.map((g, idx) => ({
        goalSheetId: id,
        thrustArea: g.thrustArea,
        title: g.title,
        description: g.description ?? null,
        uomType: g.uomType,
        target: g.target ?? null,
        targetDate: g.targetDate ?? null,
        weightage: g.weightage,
        order: idx,
      })),
    })
    // Update totalWeightage and reset status to DRAFT (in case it was RETURNED)
    await tx.goalSheet.update({
      where: { id },
      data: { totalWeightage, status: 'DRAFT' },
    })
  })

  const updated = await prisma.goalSheet.findUnique({
    where: { id },
    include: { goals: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json({ sheet: updated })
}


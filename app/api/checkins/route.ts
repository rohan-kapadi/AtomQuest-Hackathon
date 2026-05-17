import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CheckinSchema } from '@/lib/validations'

// GET /api/checkins?goalSheetId=xxx — list check-ins for a goal sheet
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const goalSheetId = searchParams.get('goalSheetId')
  if (!goalSheetId) return NextResponse.json({ error: 'goalSheetId is required' }, { status: 400 })

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: goalSheetId },
    select: { employeeId: true, managerId: true },
  })
  if (!sheet) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner   = sheet.employeeId === session.user.id
  const isManager = sheet.managerId  === session.user.id
  const isAdmin   = session.user.role === 'ADMIN'
  if (!isOwner && !isManager && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const checkins = await prisma.checkin.findMany({
    where: { goalSheetId },
    include: { manager: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ checkins })
}

// POST /api/checkins — manager adds a structured check-in comment
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Forbidden — managers only' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = CheckinSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: `${first.path.join('.')}: ${first.message}` }, { status: 422 })
  }

  const { goalSheetId, quarter, comment } = parsed.data

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: goalSheetId },
    select: { managerId: true, status: true },
  })
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  // Manager must be assigned to this sheet (or be admin)
  if (session.user.role === 'MANAGER' && sheet.managerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden — not your team member' }, { status: 403 })
  }

  const checkin = await prisma.checkin.create({
    data: {
      goalSheetId,
      managerId: session.user.id,
      quarter,
      comment,
    },
    include: { manager: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ checkin }, { status: 201 })
}

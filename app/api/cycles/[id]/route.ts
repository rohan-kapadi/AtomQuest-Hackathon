import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, startDate, endDate, isActive } = body

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'Name, start date, and end date are required' }, { status: 400 })
  }

  try {
    if (isActive) {
      await prisma.goalCycle.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      })
    }

    const cycle = await prisma.goalCycle.update({
      where: { id },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: Boolean(isActive),
      },
    })
    return NextResponse.json({ cycle })
  } catch (error) {
    console.error('Error updating cycle:', error)
    return NextResponse.json({ error: 'Failed to update cycle' }, { status: 500 })
  }
}

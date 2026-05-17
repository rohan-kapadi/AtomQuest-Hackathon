import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    // If this new cycle is active, we might want to deactivate others
    // For simplicity in the hackathon, we allow Prisma to just save it.
    // If needed, we can transactionally deactivate others.
    if (isActive) {
      await prisma.goalCycle.updateMany({ data: { isActive: false } })
    }

    const cycle = await prisma.goalCycle.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: Boolean(isActive),
      },
    })
    return NextResponse.json({ cycle }, { status: 201 })
  } catch (error) {
    console.error('Error creating cycle:', error)
    return NextResponse.json({ error: 'Failed to create cycle' }, { status: 500 })
  }
}

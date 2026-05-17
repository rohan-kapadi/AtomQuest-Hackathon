import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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

  const { name, email, role, departmentId, managerId } = body

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
  }

  // Hash default password
  const passwordHash = await bcrypt.hash('Welcome@123', 10)

  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        departmentId: departmentId || null,
        managerId: managerId || null,
      },
    })
    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

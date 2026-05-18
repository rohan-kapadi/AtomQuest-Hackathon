import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data (safe for dev/demo reset)
  await prisma.auditLog.deleteMany()
  await prisma.checkin.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.goalSheet.deleteMany()
  await prisma.goalCycle.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()

  // ─── Departments ─────────────────────────────────────────────────────────

  const salesDept = await prisma.department.create({ data: { name: 'Sales' } })
  const hrDept = await prisma.department.create({ data: { name: 'Human Resources' } })
  const techDept = await prisma.department.create({ data: { name: 'Technology' } })

  console.log('✓ Departments created')

  // ─── Users ───────────────────────────────────────────────────────────────

  const admin = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'admin@goalsphere.com',
      passwordHash: await bcrypt.hash('Admin@123', 10),
      role: 'ADMIN',
      departmentId: hrDept.id,
    },
  })

  const manager = await prisma.user.create({
    data: {
      name: 'Rahul Mehta',
      email: 'manager@goalsphere.com',
      passwordHash: await bcrypt.hash('Manager@123', 10),
      role: 'MANAGER',
      departmentId: salesDept.id,
    },
  })

  const employee = await prisma.user.create({
    data: {
      name: 'Sneha Patil',
      email: 'employee@goalsphere.com',
      passwordHash: await bcrypt.hash('Employee@123', 10),
      role: 'EMPLOYEE',
      departmentId: salesDept.id,
      managerId: manager.id,
    },
  })

  // Second employee for shared goal demo
  const employee2 = await prisma.user.create({
    data: {
      name: 'Arjun Nair',
      email: 'employee2@goalsphere.com',
      passwordHash: await bcrypt.hash('Employee@123', 10),
      role: 'EMPLOYEE',
      departmentId: salesDept.id,
      managerId: manager.id,
    },
  })

  console.log('✓ Users created')

  // ─── Goal Cycle ───────────────────────────────────────────────────────────

  const cycle = await prisma.goalCycle.create({
    data: {
      name: 'FY 2025-26',
      startDate: new Date('2025-05-01'),
      endDate: new Date('2026-04-30'),
      isActive: true,
    },
  })

  console.log('✓ Goal cycle created')

  // ─── Goal Sheet for Sneha (APPROVED — locked, for Q1 check-in demo) ──────

  const approvedSheet = await prisma.goalSheet.create({
    data: {
      cycleId: cycle.id,
      employeeId: employee.id,
      managerId: manager.id,
      status: 'APPROVED',
      submittedAt: new Date('2025-05-10'),
      approvedAt: new Date('2025-05-12'),
      lockedAt: new Date('2025-05-12'),
      totalWeightage: 100,
    },
  })

  // Goals on approved sheet
  const goal1 = await prisma.goal.create({
    data: {
      goalSheetId: approvedSheet.id,
      thrustArea: 'Revenue Growth',
      title: 'Achieve quarterly sales target',
      description: 'Meet or exceed ₹50L quarterly sales revenue',
      uomType: 'NUMERIC_MIN',
      target: 5000000,
      weightage: 40,
      order: 0,
    },
  })

  const goal2 = await prisma.goal.create({
    data: {
      goalSheetId: approvedSheet.id,
      thrustArea: 'Customer Success',
      title: 'Reduce customer complaint resolution TAT',
      description: 'Average resolution time under 24 hours',
      uomType: 'NUMERIC_MAX',
      target: 24,
      weightage: 25,
      order: 1,
    },
  })

  const goal3 = await prisma.goal.create({
    data: {
      goalSheetId: approvedSheet.id,
      thrustArea: 'Process Excellence',
      title: 'Complete CRM migration project',
      description: 'Full migration including data validation and user training',
      uomType: 'TIMELINE',
      targetDate: new Date('2025-09-30'),
      weightage: 20,
      order: 2,
    },
  })

  const goal4 = await prisma.goal.create({
    data: {
      goalSheetId: approvedSheet.id,
      thrustArea: 'Safety & Compliance',
      title: 'Zero customer data incidents',
      description: 'No data breaches, leaks, or compliance violations',
      uomType: 'ZERO',
      weightage: 15,
      order: 3,
    },
  })

  // Q1 Achievements for Sneha
  await prisma.achievement.create({
    data: {
      goalId: goal1.id,
      quarter: 'Q1',
      actualValue: 4200000,
      status: 'ON_TRACK',
      progressScore: 0.84,
      notes: 'Strong pipeline in July, closing 2 large deals in Q2',
    },
  })
  await prisma.achievement.create({
    data: {
      goalId: goal2.id,
      quarter: 'Q1',
      actualValue: 18,
      status: 'ON_TRACK',
      progressScore: 1.33,
      notes: 'New escalation process reduced TAT by 25%',
    },
  })
  await prisma.achievement.create({
    data: {
      goalId: goal3.id,
      quarter: 'Q1',
      status: 'ON_TRACK',
      notes: 'Phase 1 design complete, dev starting August',
    },
  })
  await prisma.achievement.create({
    data: {
      goalId: goal4.id,
      quarter: 'Q1',
      isZeroAchieved: true,
      status: 'COMPLETED',
      progressScore: 1.0,
      notes: 'Zero incidents. Security audit passed.',
    },
  })

  // ─── Goal Sheet for Arjun (DRAFT — for employee flow demo) ───────────────

  const draftSheet = await prisma.goalSheet.create({
    data: {
      cycleId: cycle.id,
      employeeId: employee2.id,
      managerId: manager.id,
      status: 'DRAFT',
      totalWeightage: 0,
    },
  })

  // ─── Manager check-in comment ─────────────────────────────────────────────

  await prisma.checkin.create({
    data: {
      goalSheetId: approvedSheet.id,
      managerId: manager.id,
      quarter: 'Q1',
      comment:
        'Good progress on all goals. Sales numbers are slightly below target but momentum is positive. Focus on closing the two large deals in Q2. TAT improvement is commendable — keep it up. CRM migration timeline looks feasible, please flag any blockers early.',
    },
  })

  // ─── Audit Log entries ────────────────────────────────────────────────────

  await prisma.auditLog.create({
    data: {
      goalSheetId: approvedSheet.id,
      userId: employee.id,
      action: 'GOAL_SUBMITTED',
      newValue: JSON.stringify({ status: 'SUBMITTED', submittedAt: new Date('2025-05-10') }),
    },
  })

  await prisma.auditLog.create({
    data: {
      goalSheetId: approvedSheet.id,
      userId: manager.id,
      action: 'GOAL_APPROVED',
      newValue: JSON.stringify({ status: 'APPROVED', approvedAt: new Date('2025-05-12') }),
    },
  })

  console.log('✓ Goal sheets, goals, achievements, checkins, and audit logs created')

  console.log('\n✅ Seed complete!\n')
  console.log('Login credentials:')
  console.log('  Admin:      admin@goalsphere.com       / Admin@123')
  console.log('  Manager:    manager@goalsphere.com     / Manager@123')
  console.log('  Employee 1: employee@goalsphere.com    / Employee@123')
  console.log('  Employee 2: employee2@goalsphere.com   / Employee@123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { displayScore } from '@/lib/score-calculator'

// Helper: escape CSV cell (wrap in quotes if contains comma/newline/quote)
function csvCell(val: string | number | null | undefined): string {
  const str = val == null ? '' : String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatActual(uomType: string, a: {
  actualValue: number | null
  actualDate: Date | null
  isZeroAchieved: boolean | null
} | null): string {
  if (!a) return ''
  if (uomType === 'ZERO') return a.isZeroAchieved === true ? 'Zero (✓)' : a.isZeroAchieved === false ? 'Incidents (✗)' : ''
  if (uomType === 'TIMELINE') return a.actualDate ? new Date(a.actualDate).toLocaleDateString('en-IN') : ''
  return a.actualValue != null ? String(a.actualValue) : ''
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

// GET /api/reports/export?format=csv|json
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })
  if (session.user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 })

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'csv'

  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } })
  if (!cycle) return new NextResponse('No active cycle', { status: 400 })

  const sheets = await prisma.goalSheet.findMany({
    where: { cycleId: cycle.id },
    include: {
      employee: {
        select: {
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      goals: {
        orderBy: { order: 'asc' },
        include: {
          achievements: { orderBy: { quarter: 'asc' } },
        },
      },
    },
    orderBy: [
      { employee: { name: 'asc' } },
    ],
  })

  // Flatten: one row per goal
  type Row = {
    employeeName: string
    email: string
    department: string
    sheetStatus: string
    goalTitle: string
    thrustArea: string
    uomType: string
    target: string
    weightage: string
    q1Actual: string; q1Score: string
    q2Actual: string; q2Score: string
    q3Actual: string; q3Score: string
    q4Actual: string; q4Score: string
    overallScore: string
  }

  const rows: Row[] = []

  for (const sheet of sheets) {
    for (const goal of sheet.goals) {
      const achByQ = Object.fromEntries(
        goal.achievements.map(a => [a.quarter, a])
      ) as Record<string, typeof goal.achievements[0]>

      // Weighted overall across all quarters with data
      const validScores = goal.achievements
        .filter(a => a.progressScore != null)
        .map(a => a.progressScore as number)
      const overallAvg = validScores.length > 0
        ? validScores.reduce((s, v) => s + v, 0) / validScores.length
        : null

      rows.push({
        employeeName: sheet.employee.name,
        email:        sheet.employee.email,
        department:   sheet.employee.department?.name ?? '',
        sheetStatus:  sheet.status,
        goalTitle:    goal.title,
        thrustArea:   goal.thrustArea,
        uomType:      goal.uomType,
        target:       goal.target != null
          ? String(goal.target)
          : goal.targetDate
          ? new Date(goal.targetDate).toLocaleDateString('en-IN')
          : '',
        weightage: `${goal.weightage}%`,
        q1Actual: formatActual(goal.uomType, achByQ['Q1'] ?? null),
        q1Score:  achByQ['Q1']?.progressScore != null ? displayScore(achByQ['Q1'].progressScore) : '',
        q2Actual: formatActual(goal.uomType, achByQ['Q2'] ?? null),
        q2Score:  achByQ['Q2']?.progressScore != null ? displayScore(achByQ['Q2'].progressScore) : '',
        q3Actual: formatActual(goal.uomType, achByQ['Q3'] ?? null),
        q3Score:  achByQ['Q3']?.progressScore != null ? displayScore(achByQ['Q3'].progressScore) : '',
        q4Actual: formatActual(goal.uomType, achByQ['Q4'] ?? null),
        q4Score:  achByQ['Q4']?.progressScore != null ? displayScore(achByQ['Q4'].progressScore) : '',
        overallScore: overallAvg != null ? displayScore(overallAvg) : '',
      })
    }
  }

  if (format === 'json') {
    return NextResponse.json({ cycle: cycle.name, rows })
  }

  // Build CSV
  const headers = [
    'Employee Name', 'Email', 'Department', 'Sheet Status',
    'Goal Title', 'Thrust Area', 'UoM Type', 'Target', 'Weightage (%)',
    'Q1 Actual', 'Q1 Score',
    'Q2 Actual', 'Q2 Score',
    'Q3 Actual', 'Q3 Score',
    'Q4 Actual', 'Q4 Score',
    'Overall Score',
  ]

  const csvLines = [
    headers.map(csvCell).join(','),
    ...rows.map(r => [
      csvCell(r.employeeName), csvCell(r.email), csvCell(r.department), csvCell(r.sheetStatus),
      csvCell(r.goalTitle), csvCell(r.thrustArea), csvCell(r.uomType), csvCell(r.target), csvCell(r.weightage),
      csvCell(r.q1Actual), csvCell(r.q1Score),
      csvCell(r.q2Actual), csvCell(r.q2Score),
      csvCell(r.q3Actual), csvCell(r.q3Score),
      csvCell(r.q4Actual), csvCell(r.q4Score),
      csvCell(r.overallScore),
    ].join(',')),
  ]

  const csv = csvLines.join('\r\n')
  const filename = `goalsphere-report-${cycle.name.replace(/\s+/g, '-')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

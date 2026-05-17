import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TeamProgressTable } from '@/components/dashboard/TeamProgressTable'
import { Download, FileSpreadsheet, TrendingUp } from 'lucide-react'

export const metadata = { title: 'Reports & Export - AtomQuest' }

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/manager/team')

  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } })

  const sheets = cycle
    ? await prisma.goalSheet.findMany({
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
        orderBy: { employee: { name: 'asc' } },
      })
    : []

  const rows = sheets.flatMap(sheet =>
    sheet.goals.map(goal => {
      const achByQ = Object.fromEntries(goal.achievements.map(a => [a.quarter, a]))
      const scores = goal.achievements.filter(a => a.progressScore != null).map(a => a.progressScore as number)
      const overall = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null
      return {
        employeeName: sheet.employee.name,
        department: sheet.employee.department?.name ?? '-',
        sheetStatus: sheet.status,
        goalTitle: goal.title,
        thrustArea: goal.thrustArea,
        uomType: goal.uomType,
        target: goal.target ?? null,
        targetDate: goal.targetDate?.toISOString() ?? null,
        weightage: goal.weightage,
        achievements: {
          Q1: achByQ['Q1'] ? { ...achByQ['Q1'], actualDate: achByQ['Q1'].actualDate?.toISOString() ?? null } : null,
          Q2: achByQ['Q2'] ? { ...achByQ['Q2'], actualDate: achByQ['Q2'].actualDate?.toISOString() ?? null } : null,
          Q3: achByQ['Q3'] ? { ...achByQ['Q3'], actualDate: achByQ['Q3'].actualDate?.toISOString() ?? null } : null,
          Q4: achByQ['Q4'] ? { ...achByQ['Q4'], actualDate: achByQ['Q4'].actualDate?.toISOString() ?? null } : null,
        },
        overallScore: overall,
      }
    })
  )

  const totalRows = rows.length

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Export</h1>
          <p className="page-subtitle">
            {cycle ? cycle.name : 'No active cycle'} · {totalRows} goal records
          </p>
        </div>

        <a
          href="/api/reports/export?format=csv"
          download
          className="inline-flex items-center gap-2 rounded-xl bg-[image:var(--accent-gradient)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)]"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      {!cycle && (
        <div className="glass-panel rounded-3xl border-amber-500/20 p-5 text-sm text-amber-300">
          No active goal cycle. Activate a cycle to generate reports.
        </div>
      )}

      {cycle && (
        <div className="glass-panel glass-border flex items-center gap-3 rounded-3xl p-4 text-sm text-slate-300">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
            <FileSpreadsheet className="h-4 w-4 text-blue-300" />
          </div>
          <span>
            Preview below shows all {totalRows} goal records for <strong>{cycle.name}</strong>. Download CSV to open in Excel or Google Sheets.
          </span>
        </div>
      )}

      {rows.length > 0 && <TeamProgressTable rows={rows} />}

      {rows.length === 0 && cycle && (
        <div className="glass-panel glass-border rounded-3xl p-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-slate-500">No goal data yet for this cycle.</p>
        </div>
      )}
    </div>
  )
}

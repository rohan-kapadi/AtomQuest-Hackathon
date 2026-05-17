import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Users, CheckCircle2, Clock, RotateCcw, Target, BarChart2, AlertTriangle, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts'

export const metadata = { title: 'Admin Dashboard - AtomQuest' }

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/manager/team')

  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } })

  const [totalEmployees, sheetsByStatus] = await Promise.all([
    prisma.user.count({ where: { role: { in: ['EMPLOYEE', 'MANAGER'] } } }),
    cycle
      ? prisma.goalSheet.groupBy({
          by: ['status'],
          where: { cycleId: cycle.id },
          _count: { id: true },
        })
      : [],
  ])

  const statusCount = Object.fromEntries(
    sheetsByStatus.map(s => [s.status, s._count.id])
  ) as Record<string, number>

  const totalSheets = Object.values(statusCount).reduce((a, b) => a + b, 0)
  const notStarted = Math.max(0, totalEmployees - totalSheets)
  const approvedCount = (statusCount['APPROVED'] ?? 0) + (statusCount['LOCKED'] ?? 0)
  const approvalRate = totalEmployees > 0 ? Math.round((approvedCount / totalEmployees) * 100) : 0

  const employeesWithAchievements = cycle
    ? await prisma.user.count({
        where: {
          role: { in: ['EMPLOYEE', 'MANAGER'] },
          goalSheets: {
            some: {
              cycleId: cycle.id,
              goals: { some: { achievements: { some: {} } } },
            },
          },
        },
      })
    : 0

  const managers = await prisma.user.findMany({
    where: { role: 'MANAGER' },
    select: {
      id: true, name: true,
      reports: { select: { id: true } },
      managedSheets: cycle
        ? { where: { cycleId: cycle.id }, select: { status: true } }
        : { select: { status: true }, take: 0 },
    },
    orderBy: { name: 'asc' },
  })

  const thrustAreaGroups = cycle
    ? await prisma.goal.groupBy({
        by: ['thrustArea'],
        where: { goalSheet: { cycleId: cycle.id } },
        _count: { id: true },
      })
    : []
  const thrustAreaData = thrustAreaGroups.map(g => ({
    thrustArea: g.thrustArea,
    count: g._count.id,
  }))

  const achievements = cycle
    ? await prisma.achievement.findMany({
        where: { goal: { goalSheet: { cycleId: cycle.id } }, progressScore: { not: null } },
        select: { quarter: true, progressScore: true },
      })
    : []

  const qStats = achievements.reduce((acc, ach) => {
    if (!acc[ach.quarter]) acc[ach.quarter] = { sum: 0, count: 0 }
    acc[ach.quarter].sum += ach.progressScore!
    acc[ach.quarter].count += 1
    return acc
  }, {} as Record<string, { sum: number, count: number }>)

  const qoqData = ['Q1', 'Q2', 'Q3', 'Q4']
    .filter(q => qStats[q] && qStats[q].count > 0)
    .map(q => ({
      quarter: q,
      avgScore: Math.round((qStats[q].sum / qStats[q].count) * 100)
    }))

  const stats = [
    { label: 'Total Employees', value: totalEmployees, icon: Users, tone: 'border-blue-500/20 bg-blue-500/10 text-blue-300' },
    { label: 'Not Started', value: notStarted, icon: AlertTriangle, tone: 'border-red-500/20 bg-red-500/10 text-red-300', sub: `${Math.round((notStarted / totalEmployees) * 100) || 0}% of employees` },
    { label: 'Submitted', value: statusCount['SUBMITTED'] ?? 0, icon: Clock, tone: 'border-amber-500/20 bg-amber-500/10 text-amber-300', sub: 'Awaiting approval' },
    { label: 'Approved / Locked', value: approvedCount, icon: CheckCircle2, tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300', sub: `${approvalRate}% completion rate` },
    { label: 'Returned', value: statusCount['RETURNED'] ?? 0, icon: RotateCcw, tone: 'border-orange-500/20 bg-orange-500/10 text-orange-300' },
    { label: 'Logging Achievements', value: employeesWithAchievements, icon: TrendingUp, tone: 'border-violet-500/20 bg-violet-500/10 text-violet-300' },
  ]

  return (
    <div className="space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            {cycle ? cycle.name : 'No active cycle'} · Enterprise-wide completion overview
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/audit-log" className="inline-flex items-center rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white">
            Audit Log
          </Link>
          <Link href="/admin/reports" className="inline-flex items-center rounded-xl bg-[image:var(--accent-gradient)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_30px_rgba(124,58,237,0.28)]">
            Export Report
          </Link>
        </div>
      </div>

      {cycle && (
        <div className="glass-panel glass-border rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-slate-500">Overall Completion Rate</h2>
            <span className="metric-number text-3xl text-white">{approvalRate}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[image:var(--accent-gradient)] transition-all duration-700" style={{ width: `${approvalRate}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{approvedCount} approved</span>
            <span>{totalEmployees} total employees</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass-panel glass-panel-hover rounded-3xl p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${stat.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
              <p className="metric-number text-3xl text-white">{stat.value}</p>
              {stat.sub && <p className="mt-2 text-xs text-slate-500">{stat.sub}</p>}
            </div>
          )
        })}
      </div>

      {managers.length > 0 && (
        <div className="glass-panel glass-border overflow-hidden rounded-3xl">
          <div className="border-b border-white/6 px-6 py-4">
            <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.08em] text-slate-400">
              <Target className="h-4 w-4 text-violet-300" />
              Manager-Wise Approval Status
            </h2>
          </div>
          <div className="divide-y divide-white/6">
            {managers.map(manager => {
              const teamSize = manager.reports.length
              const approved = manager.managedSheets.filter(s => s.status === 'APPROVED' || s.status === 'LOCKED').length
              const submitted = manager.managedSheets.filter(s => s.status === 'SUBMITTED').length
              const returned = manager.managedSheets.filter(s => s.status === 'RETURNED').length
              const rate = teamSize > 0 ? Math.round((approved / teamSize) * 100) : 0

              return (
                <div key={manager.id} className="grid gap-4 px-6 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-sm font-semibold text-white">
                      {manager.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{manager.name}</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-[image:var(--accent-gradient)]" style={{ width: `${rate}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center text-xs">
                    <div>
                      <p className="metric-number text-emerald-300">{approved}</p>
                      <p className="mt-1 text-slate-500">Approved</p>
                    </div>
                    <div>
                      <p className="metric-number text-amber-300">{submitted}</p>
                      <p className="mt-1 text-slate-500">Pending</p>
                    </div>
                    <div>
                      <p className="metric-number text-orange-300">{returned}</p>
                      <p className="mt-1 text-slate-500">Returned</p>
                    </div>
                    <div>
                      <p className="metric-number text-white">{rate}%</p>
                      <p className="mt-1 text-slate-500">of {teamSize}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { href: '/admin/shared-goals', label: 'Push Shared Goals', desc: 'Distribute a goal to multiple employees.' },
          { href: '/admin/audit-log', label: 'View Audit Log', desc: 'Review the full trail of system changes.' },
          { href: '/admin/reports', label: 'Export Reports', desc: 'Download reporting-ready performance data.' },
        ].map(link => (
          <Link key={link.href} href={link.href} className="glass-panel glass-panel-hover rounded-3xl p-5">
            <p className="text-base font-medium text-white">{link.label}</p>
            <p className="mt-2 text-sm text-slate-500">{link.desc}</p>
          </Link>
        ))}
      </div>

      {(thrustAreaData.length > 0 || qoqData.length > 0) && (
        <AnalyticsCharts thrustAreaData={thrustAreaData} qoqData={qoqData} />
      )}
    </div>
  )
}

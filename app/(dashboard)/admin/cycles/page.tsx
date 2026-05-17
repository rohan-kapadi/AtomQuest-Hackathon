import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GitBranch, Calendar, CheckCircle2 } from 'lucide-react'
import { CycleModal } from '@/components/admin/CycleModal'

export const metadata = { title: 'Goal Cycles - AtomQuest' }

export default async function AdminCyclesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard')

  const cycles = await prisma.goalCycle.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { goalSheets: true } }
    }
  })

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Goal Cycles</h1>
          <p className="page-subtitle">Manage performance tracking periods.</p>
        </div>
        <CycleModal mode="create" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cycles.map(cycle => (
          <div key={cycle.id} className={`glass-panel rounded-3xl p-5 ${cycle.isActive ? 'border-violet-500/20' : ''}`}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{cycle.name}</h3>
                {cycle.isActive && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                )}
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                <GitBranch className="h-5 w-5 text-violet-300" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-500">Duration</p>
                <p className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  {new Date(cycle.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} -
                  {new Date(cycle.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-500">Goal Sheets</p>
                <p className="metric-number text-slate-300">{cycle._count.goalSheets} enrolled</p>
              </div>
            </div>

            <div className="mt-5 border-t border-white/6 pt-4">
              <CycleModal mode="edit" cycle={cycle} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

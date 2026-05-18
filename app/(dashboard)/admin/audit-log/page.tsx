import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuditTimeline } from '@/components/dashboard/AuditTimeline'
import { Shield, Search } from 'lucide-react'

export const metadata = { title: 'Audit Log — GoalSphere Admin' }

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/manager/team')

  const { action, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1'))
  const PAGE_SIZE = 50

  const where = action ? { action } : {}

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        goalSheet: {
          select: {
            id: true,
            employee: { select: { id: true, name: true } },
            cycle: { select: { name: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ])

  // Get distinct action types for filter
  const actionTypes = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ['action'],
    orderBy: { action: 'asc' },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          Audit Log
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Complete trail of all changes — {total} total entries.
        </p>
      </div>

      {/* Action filter */}
      <div className="flex gap-2 flex-wrap">
        <a
          href="/admin/audit-log"
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            !action ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
          }`}
        >
          All ({total})
        </a>
        {actionTypes.map(({ action: a }: { action: string }) => (
          <a
            key={a}
            href={`/admin/audit-log?action=${a}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              action === a ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {a.replace(/_/g, ' ')}
          </a>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No audit entries yet.</p>
        </div>
      ) : (
        <AuditTimeline logs={logs.map(l => ({
          id: l.id,
          action: l.action,
          fieldChanged: l.fieldChanged,
          oldValue: l.oldValue,
          newValue: l.newValue,
          reason: l.reason,
          timestamp: l.timestamp.toISOString(),
          user: l.user,
          goalSheet: {
            id: l.goalSheet.id,
            employeeName: l.goalSheet.employee.name,
            cycleName: l.goalSheet.cycle.name,
          },
        }))} />
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Showing {(pageNum - 1) * PAGE_SIZE + 1}–{Math.min(pageNum * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <a href={`/admin/audit-log?${action ? `action=${action}&` : ''}page=${pageNum - 1}`}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors text-xs">
                ← Previous
              </a>
            )}
            {pageNum * PAGE_SIZE < total && (
              <a href={`/admin/audit-log?${action ? `action=${action}&` : ''}page=${pageNum + 1}`}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors text-xs">
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

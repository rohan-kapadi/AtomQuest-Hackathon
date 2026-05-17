import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Users, Building2, User, Mail, Shield } from 'lucide-react'
import { AddEmployeeModal } from '@/components/admin/AddEmployeeModal'

export const metadata = { title: 'Employee Directory - AtomQuest' }

export default async function AdminEmployeesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard')

  const employees = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      department: true,
      manager: { select: { name: true } },
      _count: { select: { managedSheets: true } }
    }
  })

  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const managers = await prisma.user.findMany({
    where: { role: 'MANAGER' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">
            Manage organization users and roles ({employees.length} total)
          </p>
        </div>
        <AddEmployeeModal departments={departments} managers={managers} />
      </div>

      <div className="glass-panel glass-border overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Manager</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-xs font-semibold text-slate-300">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Mail className="h-3 w-3" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      user.role === 'ADMIN' ? 'border-violet-500/20 bg-violet-500/10 text-violet-300' :
                      user.role === 'MANAGER' ? 'border-teal-500/20 bg-teal-500/10 text-teal-300' :
                      'border-slate-500/20 bg-slate-500/10 text-slate-300'
                    }`}>
                      {user.role === 'ADMIN' ? <Shield className="h-3 w-3" /> : user.role === 'MANAGER' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {user.role}
                    </span>
                    {user.role === 'MANAGER' && (
                      <p className="mt-2 text-xs text-slate-500">{user._count.managedSheets} direct reports</p>
                    )}
                  </td>
                  <td className="text-slate-400">
                    {user.department ? (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {user.department.name}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="text-slate-400">
                    {user.manager ? user.manager.name : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

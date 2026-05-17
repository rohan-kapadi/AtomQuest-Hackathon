import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { RoleSwitcher } from '@/components/layout/RoleSwitcher'
import type { Role } from '@prisma/client'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? 'Unknown',
    email: session.user.email ?? '',
    role: session.user.role as Role,
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.10),transparent_20%)]" />
      <Sidebar user={user} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/6 bg-[#11131d]/70 px-6 backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(99,102,241,0.18))] shadow-[0_8px_24px_rgba(124,58,237,0.18)]">
              <div className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.8)]" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-white">AtomQuest</h2>
              <p className="text-xs text-slate-500">FY 2025-26 Active Cycle</p>
            </div>
          </div>

          <RoleSwitcher currentRole={user.role} currentName={user.name} />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

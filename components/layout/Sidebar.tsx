'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import {
  Target,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users,
  ClipboardList,
  BarChart3,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  ScrollText,
  Share2,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Role } from '@prisma/client'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  EMPLOYEE: [
    { label: 'My Goals', href: '/employee/goals', icon: Target },
    { label: 'New Goal Sheet', href: '/employee/goals/new', icon: FileText },
  ],
  MANAGER: [
    { label: 'Team Overview', href: '/manager/team', icon: LayoutDashboard },
    { label: 'Pending Approvals', href: '/manager/approvals', icon: ClipboardList },
    { label: 'Check-ins', href: '/manager/checkins', icon: CheckSquare },
    { label: 'My Goals', href: '/employee/goals', icon: Target },
  ],
  ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
    { label: 'Goal Cycles', href: '/admin/cycles', icon: GitBranch },
    { label: 'Employees', href: '/admin/employees', icon: Users },
    { label: 'Shared Goals', href: '/admin/shared-goals', icon: Share2 },
    { label: 'Audit Trail', href: '/admin/audit-log', icon: ScrollText },
    { label: 'Reports', href: '/admin/reports', icon: TrendingUp },
    { label: 'Approvals', href: '/manager/approvals', icon: ClipboardList },
  ],
}

const ROLE_META: Record<Role, { label: string; color: string; icon: React.ElementType }> = {
  EMPLOYEE: { label: 'Employee', color: 'border-slate-500/20 bg-slate-500/10 text-slate-300', icon: Target },
  MANAGER: { label: 'Manager', color: 'border-teal-500/20 bg-teal-500/10 text-teal-300', icon: Users },
  ADMIN: { label: 'Admin', color: 'border-violet-500/20 bg-violet-500/10 text-violet-300', icon: Shield },
}

interface SidebarProps {
  user: {
    name: string
    email: string
    role: Role
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const navItems = NAV_ITEMS[user.role] ?? []
  const roleMeta = ROLE_META[user.role]
  const RoleIcon = roleMeta.icon

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirect: false })
    window.location.href = '/login'
  }

  return (
    <aside
      className={`relative z-10 flex h-screen flex-col border-r border-white/6 bg-[#141520]/92 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#1c1e2e] text-slate-400 shadow-lg transition-colors hover:border-violet-500/30 hover:text-white"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className={`flex items-center gap-3 border-b border-white/6 p-4 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-[0_12px_32px_rgba(124,58,237,0.2)]">
          <Image src="/logo.png" alt="GoalSphere" width={40} height={40} className="h-full w-full object-contain p-1" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-heading text-sm font-semibold text-white">GoalSphere</span>
            <p className="text-xs text-slate-500">Performance OS</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {!collapsed && (
          <p className="px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            Workspace
          </p>
        )}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'border border-violet-500/20 bg-violet-500/10 text-violet-200'
                    : 'border border-transparent text-slate-400 hover:bg-[#1c1e2e] hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[image:var(--accent-gradient)]" />
                )}
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-violet-300' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="space-y-3 border-t border-white/6 p-3">
        {!collapsed && (
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${roleMeta.color}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            <RoleIcon className="w-3 h-3 opacity-80" />
            <span>{roleMeta.label}</span>
          </div>
        )}

        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="h-10 w-10 flex-shrink-0 border border-white/10 bg-gradient-to-br from-violet-500 to-blue-600">
            <AvatarFallback className="bg-gradient-to-br from-violet-600 to-blue-700 text-xs font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          title={collapsed ? 'Sign out' : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-all duration-150 hover:bg-red-500/10 hover:text-red-300 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>}
        </button>
      </div>
    </aside>
  )
}

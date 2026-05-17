'use client'

import { signIn, signOut } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users, User, ChevronDown, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Role } from '@prisma/client'

const ROLES = [
  {
    role: 'ADMIN' as Role,
    label: 'Priya Sharma (Admin)',
    email: 'admin@atomquest.com',
    password: 'Admin@123',
    icon: Shield,
    color: 'from-violet-500 to-purple-600',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  },
  {
    role: 'MANAGER' as Role,
    label: 'Rahul Mehta (Manager)',
    email: 'manager@atomquest.com',
    password: 'Manager@123',
    icon: Users,
    color: 'from-blue-500 to-cyan-600',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  {
    role: 'EMPLOYEE' as Role,
    label: 'Sneha Patil (Employee)',
    email: 'employee@atomquest.com',
    password: 'Employee@123',
    icon: User,
    color: 'from-emerald-500 to-teal-600',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
]

interface RoleSwitcherProps {
  currentRole: Role
  currentName: string
}

export function RoleSwitcher({ currentRole, currentName }: RoleSwitcherProps) {
  const router = useRouter()
  const [switching, setSwitching] = useState<Role | null>(null)

  const current = ROLES.find((r) => r.role === currentRole)
  const CurrentIcon = current?.icon ?? User

  async function switchTo(target: typeof ROLES[0]) {
    if (target.role === currentRole) return
    setSwitching(target.role)

    await signOut({ redirect: false })
    const result = await signIn('credentials', {
      email: target.email,
      password: target.password,
      redirect: false,
    })

    setSwitching(null)

    if (!result?.error) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white transition-all duration-150 hover:border-violet-500/20 hover:bg-white/[0.05]">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${current?.color}`}>
          <CurrentIcon className="w-3 h-3 text-white" />
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="max-w-[120px] truncate text-sm">{currentName}</p>
          <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Demo session</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${current?.badge}`}>
          {currentRole}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-500 transition-colors group-hover:text-slate-300" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="pb-1 text-xs font-medium text-slate-400">
          Demo - Switch Role
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((demo) => {
          const Icon = demo.icon
          const isActive = demo.role === currentRole
          const isLoading = switching === demo.role

          return (
            <DropdownMenuItem
              key={demo.role}
              onClick={() => switchTo(demo)}
              disabled={isActive || switching !== null}
              className={`mx-1 mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? 'cursor-default bg-white/[0.05] text-white'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white focus:bg-white/[0.04]'
              }`}
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${demo.color}`}>
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Icon className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{demo.label}</p>
                <p className="text-xs text-slate-500">{demo.email}</p>
              </div>
              {isActive && <span className="text-xs text-slate-500">current</span>}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <p className="px-3 py-2 text-center text-xs text-slate-500">
          Hackathon demo mode
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

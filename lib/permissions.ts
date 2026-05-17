import { Role } from '@prisma/client'

// ─── Permission Strings ──────────────────────────────────────────────────────

export type Permission =
  // Employee
  | 'goals:create'
  | 'goals:edit:own:draft'
  | 'goals:submit'
  | 'goals:view:own'
  | 'achievements:log:own'
  | 'checkins:view:own'
  // Manager (extends Employee)
  | 'goals:view:team'
  | 'goals:edit:team:pending'
  | 'goals:approve'
  | 'goals:return'
  | 'checkins:create'
  | 'shared-goals:push'
  // Admin (extends Manager)
  | 'goals:unlock'
  | 'cycles:manage'
  | 'org:manage'
  | 'audit:view'
  | 'reports:export'
  | 'shared-goals:push:all'

const EMPLOYEE_PERMISSIONS: Permission[] = [
  'goals:create',
  'goals:edit:own:draft',
  'goals:submit',
  'goals:view:own',
  'achievements:log:own',
  'checkins:view:own',
]

const MANAGER_PERMISSIONS: Permission[] = [
  ...EMPLOYEE_PERMISSIONS,
  'goals:view:team',
  'goals:edit:team:pending',
  'goals:approve',
  'goals:return',
  'checkins:create',
  'shared-goals:push',
]

const ADMIN_PERMISSIONS: Permission[] = [
  ...MANAGER_PERMISSIONS,
  'goals:unlock',
  'cycles:manage',
  'org:manage',
  'audit:view',
  'reports:export',
  'shared-goals:push:all',
]

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  EMPLOYEE: EMPLOYEE_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: ${role} cannot perform ${permission}`)
  }
}

/** Use in API routes to get the role permissions for quick checks */
export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role]
}

/** Returns the default redirect path after login based on role */
export function getRoleHomePath(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard'
    case 'MANAGER':
      return '/manager/team'
    case 'EMPLOYEE':
    default:
      return '/employee/goals'
  }
}

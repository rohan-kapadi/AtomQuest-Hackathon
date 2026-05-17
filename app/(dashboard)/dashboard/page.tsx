import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRoleHomePath } from '@/lib/permissions'
import type { Role } from '@prisma/client'

// /dashboard — redirect to role-specific home
export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const home = getRoleHomePath(session.user.role as Role)
  redirect(home)
}

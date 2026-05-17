import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import type { Role } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { department: true },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        }
      },
    }),
  ],
})

/** Server-side helper: get session user with role guarantee */
export async function getSessionUser() {
  const session = await auth()
  return session?.user ?? null
}

/** Throws if not authenticated or role doesn't match */
export async function requireAuth(allowedRoles?: Role[]) {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}

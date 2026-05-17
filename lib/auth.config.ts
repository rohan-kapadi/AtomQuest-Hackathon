import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@prisma/client'

// Extend NextAuth types to include our custom fields
declare module 'next-auth' {
  interface User {
    role: Role
    departmentId?: string | null
  }
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      departmentId?: string | null
    }
  }
}

import 'next-auth/jwt'

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role
    departmentId?: string | null
  }
}

export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = (user as any).role
        token.departmentId = (user as any).departmentId
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role as Role
        session.user.departmentId = token.departmentId as string | null
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  providers: [], // Empty here, populated in auth.ts which runs in Node.js
} satisfies NextAuthConfig

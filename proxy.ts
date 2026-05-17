import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getRoleHomePath } from '@/lib/permissions'
import type { Role } from '@prisma/client'

export default auth(async function proxy(req: NextRequest & { auth: any }) {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ─── Public routes — always allow ────────────────────────────────────────
  if (pathname === '/login' || pathname === '/') {
    // If already logged in, redirect to their dashboard
    if (session?.user) {
      const home = getRoleHomePath(session.user.role as Role)
      return NextResponse.redirect(new URL(home, req.url))
    }
    return NextResponse.next()
  }

  // ─── Protected routes — require authentication ────────────────────────────
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = session.user.role as Role

  // ─── Role-based route guards ──────────────────────────────────────────────

  // Employee trying to access manager or admin routes
  if (pathname.startsWith('/manager') && role === 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/employee/goals', req.url))
  }
  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return NextResponse.redirect(new URL(getRoleHomePath(role), req.url))
  }

  // Root dashboard redirect → role home
  if (pathname === '/dashboard' || pathname === '/') {
    return NextResponse.redirect(new URL(getRoleHomePath(role), req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Protect all dashboard routes
    '/employee/:path*',
    '/manager/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    // Handle login redirect for authenticated users
    '/login',
  ],
}

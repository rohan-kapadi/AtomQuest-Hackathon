'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Target, Shield, Users, User, ArrowRight } from 'lucide-react'

const DEMO_ROLES = [
  {
    role: 'ADMIN',
    label: 'Admin / HR',
    email: 'admin@goalsphere.com',
    password: 'Admin@123',
    icon: Shield,
    color: 'from-violet-500 to-purple-600',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    desc: 'Manage cycles, audit trails, reports, and org controls.',
  },
  {
    role: 'MANAGER',
    label: 'Manager (L1)',
    email: 'manager@goalsphere.com',
    password: 'Manager@123',
    icon: Users,
    color: 'from-cyan-500 to-blue-600',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    desc: 'Review submissions, run check-ins, and guide team execution.',
  },
  {
    role: 'EMPLOYEE',
    label: 'Employee',
    email: 'employee@goalsphere.com',
    password: 'Employee@123',
    icon: User,
    color: 'from-slate-500 to-slate-700',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    desc: 'Create goals, log progress, and track quarterly performance.',
  },
]

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeDemo, setActiveDemo] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password. Please try again.')
    } else {
      router.push(callbackUrl || '/dashboard')
      router.refresh()
    }
  }

  async function handleDemoLogin(demoRole: typeof DEMO_ROLES[number]) {
    setError('')
    setActiveDemo(demoRole.role)
    setEmail(demoRole.email)
    setPassword(demoRole.password)

    const result = await signIn('credentials', {
      email: demoRole.email,
      password: demoRole.password,
      redirect: false,
    })

    setActiveDemo(null)

    if (result?.error) {
      setError('Demo login failed. Make sure the database is seeded.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0e0f14] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-80 w-80 rounded-full bg-violet-600/18 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-indigo-500/16 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
            <div className="flex h-8 w-8 overflow-hidden items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(124,58,237,0.35)]">
              <Image src="/logo.png" alt="GoalSphere" width={32} height={32} className="h-full w-full object-contain p-0.5" />
            </div>
            GoalSphere Enterprise Performance OS
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Goal setting built like a modern command center.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-400">
              A unified workspace for employees, managers, and HR to launch cycles, approve goals, run check-ins, and export performance intelligence.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {DEMO_ROLES.map((demo) => {
              const Icon = demo.icon
              const isLoading = activeDemo === demo.role

              return (
                <button
                  key={demo.role}
                  onClick={() => handleDemoLogin(demo)}
                  disabled={activeDemo !== null}
                  className="glass-panel glass-panel-hover rounded-2xl p-4 text-left"
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${demo.color}`}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Icon className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className={`mb-3 inline-flex rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ${demo.badge}`}>
                    {demo.role}
                  </div>
                  <p className="text-sm font-medium text-white">{demo.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{demo.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="pb-2">
            <CardTitle>Sign in to GoalSphere</CardTitle>
            <CardDescription>
              Use your credentials or jump into one of the seeded demo roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">Quick demo access</p>
              <div className="mt-3 space-y-2">
                {DEMO_ROLES.map((demo) => (
                  <button
                    key={`mini-${demo.role}`}
                    onClick={() => handleDemoLogin(demo)}
                    disabled={activeDemo !== null}
                    className="flex w-full items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div>
                      <p className="text-sm text-white">{demo.label}</p>
                      <p className="text-xs text-slate-500">{demo.email}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-slate-500">
              AtomQuest Hackathon 1.0
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0e0f14]" />}>
      <LoginContent />
    </Suspense>
  )
}

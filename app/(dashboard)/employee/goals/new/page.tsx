import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoalSheetForm } from '@/components/goals/GoalSheetForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'New Goal Sheet — GoalSphere',
}

export default async function NewGoalSheetPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // Fetch active cycles for the dropdown
  const cycles = await prisma.goalCycle.findMany({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, isActive: true },
  })

  // Also include inactive cycles so user can see them (but not submit)
  const allCycles = await prisma.goalCycle.findMany({
    orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
    select: { id: true, name: true, isActive: true },
  })

  if (allCycles.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/employee/goals"
            className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Goals
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center bg-gray-900 border border-gray-800 rounded-2xl">
          <p className="text-gray-400 font-medium">No goal cycles have been created yet.</p>
          <p className="text-gray-600 text-sm mt-1">
            Please ask your Admin to create a goal cycle first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <Link
          href="/employee/goals"
          className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Goal Sheets
        </Link>
        <h1 className="text-2xl font-bold text-white">Create New Goal Sheet</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Define your goals for the cycle. You must reach exactly 100% total weightage to submit.
        </p>
      </div>

      {/* Rules card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Max goals', value: '8' },
          { label: 'Min weightage', value: '10%' },
          { label: 'Total required', value: '100%' },
          { label: 'UoM types', value: '4' },
        ].map((rule) => (
          <div
            key={rule.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center"
          >
            <p className="text-lg font-bold text-violet-400">{rule.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{rule.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <GoalSheetForm cycles={allCycles} defaultCycleId={cycles[0]?.id} />
    </div>
  )
}

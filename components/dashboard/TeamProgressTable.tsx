'use client'

import { displayScore, getScoreColor, COLOR_MAP } from '@/lib/score-calculator'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'
const QUARTERS: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4']

interface Achievement {
  progressScore: number | null
  actualValue: number | null
  actualDate: string | null
  isZeroAchieved: boolean | null
}

interface Row {
  employeeName: string
  department: string
  sheetStatus: string
  goalTitle: string
  thrustArea: string
  uomType: string
  target: number | null
  targetDate: string | null
  weightage: number
  achievements: Record<Quarter, Achievement | null>
  overallScore: number | null
}

interface Props { rows: Row[] }

function actualText(uomType: string, a: Achievement | null): string {
  if (!a) return '-'
  if (uomType === 'ZERO') return a.isZeroAchieved === true ? 'Zero' : a.isZeroAchieved === false ? 'Incident' : '-'
  if (uomType === 'TIMELINE') return a.actualDate ? new Date(a.actualDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'
  return a.actualValue != null ? a.actualValue.toLocaleString() : '-'
}

export function TeamProgressTable({ rows }: Props) {
  const [search, setSearch] = useState('')

  const filtered = rows.filter(r =>
    r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    r.goalTitle.toLowerCase().includes(search.toLowerCase()) ||
    r.thrustArea.toLowerCase().includes(search.toLowerCase()) ||
    r.department.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="glass-panel glass-border overflow-hidden rounded-3xl">
      <div className="border-b border-white/6 p-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, goal, department..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table min-w-[1200px] text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-44 bg-[#161826]">Employee</th>
              <th>Dept</th>
              <th className="min-w-52">Goal</th>
              <th>Thrust Area</th>
              <th className="text-right">Wt</th>
              <th className="text-right">Target</th>
              {QUARTERS.map(q => (
                <th key={q} className="text-center" colSpan={2}>
                  {q}
                </th>
              ))}
              <th className="text-center">Overall</th>
            </tr>
            <tr className="border-b border-white/6 bg-white/[0.015] text-slate-500">
              <td colSpan={6} />
              {QUARTERS.flatMap(q => [
                <td key={`${q}-a`} className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.08em]">Actual</td>,
                <td key={`${q}-s`} className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.08em]">Score</td>,
              ])}
              <td />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={20} className="py-10 text-center text-slate-500">No results match your search.</td>
              </tr>
            )}
            {filtered.map((row, idx) => {
              const overallTier = row.overallScore != null ? getScoreColor(row.overallScore) : null
              const overallColors = overallTier ? COLOR_MAP[overallTier] : null

              return (
                <tr key={idx}>
                  <td className="sticky left-0 z-10 border-r border-white/6 bg-[#141520]">
                    <p className="font-medium text-white">{row.employeeName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.sheetStatus}</p>
                  </td>
                  <td>{row.department}</td>
                  <td className="whitespace-normal">
                    <p className="leading-6 text-white">{row.goalTitle}</p>
                  </td>
                  <td className="text-slate-400">{row.thrustArea}</td>
                  <td className="metric-number text-right">{row.weightage}%</td>
                  <td className="metric-number text-right">
                    {row.target != null
                      ? row.target.toLocaleString()
                      : row.targetDate
                        ? new Date(row.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '-'}
                  </td>
                  {QUARTERS.flatMap(q => {
                    const a = row.achievements[q]
                    const score = a?.progressScore ?? null
                    const tier = score != null ? getScoreColor(score) : null
                    const colors = tier ? COLOR_MAP[tier] : null

                    return [
                      <td key={`${idx}-${q}-a`} className="px-2 py-4 text-center text-slate-400">
                        {actualText(row.uomType, a)}
                      </td>,
                      <td key={`${idx}-${q}-s`} className="px-2 py-4 text-center">
                        {score != null && colors ? (
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors.text} ${colors.bg}`}>
                            {displayScore(score)}
                          </span>
                        ) : <span className="text-slate-600">-</span>}
                      </td>,
                    ]
                  })}
                  <td className="px-3 py-4 text-center">
                    {row.overallScore != null && overallColors ? (
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${overallColors.text} ${overallColors.bg}`}>
                        {displayScore(row.overallScore)}
                      </span>
                    ) : <span className="text-slate-600">-</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/6 px-4 py-3 text-xs text-slate-500">
        Showing {filtered.length} of {rows.length} goal records
      </div>
    </div>
  )
}

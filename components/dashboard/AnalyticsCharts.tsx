'use client'

import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart
} from 'recharts'
import { PieChart as PieChartIcon, TrendingUp } from 'lucide-react'

interface ThrustAreaStat {
  thrustArea: string
  count: number
}

interface QoQStat {
  quarter: string
  avgScore: number
}

interface Props {
  thrustAreaData: ThrustAreaStat[]
  qoqData: QoQStat[]
}

const COLORS = ['#8b5cf6', '#7c3aed', '#6366f1', '#4f46e5', '#3b82f6', '#10b981']

const tooltipStyle = {
  backgroundColor: '#141520',
  borderColor: 'rgba(255,255,255,0.08)',
  borderRadius: '16px',
  color: '#f1f5f9',
}

export function AnalyticsCharts({ thrustAreaData, qoqData }: Props) {
  const pieData = thrustAreaData.map((item) => ({
    name: item.thrustArea,
    value: item.count
  }))

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="glass-panel glass-border rounded-3xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
            <PieChartIcon className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Goal Distribution</h2>
            <p className="text-sm text-slate-500">Thrust-area coverage across the active cycle.</p>
          </div>
        </div>

        <div className="h-[320px] w-full text-xs">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="48%"
                  innerRadius={74}
                  outerRadius={108}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="rgba(14,15,20,0.8)"
                  strokeWidth={6}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">No data available</div>
          )}
        </div>
      </div>

      <div className="glass-panel glass-border rounded-3xl p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
            <TrendingUp className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Achievement Trend</h2>
            <p className="text-sm text-slate-500">Average quarterly progress across the organization.</p>
          </div>
        </div>

        <div className="h-[320px] w-full text-xs">
          {qoqData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={qoqData} margin={{ top: 10, right: 12, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="atomquestArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="quarter" stroke="#64748b" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `${val}%`} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#c4b5fd' }}
                  formatter={(value) => [`${value ?? 0}%`, 'Avg Progress']}
                />
                <Area type="monotone" dataKey="avgScore" stroke="none" fill="url(#atomquestArea)" />
                <Line
                  type="monotone"
                  dataKey="avgScore"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ r: 0 }}
                  activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#c4b5fd', strokeWidth: 2 }}
                  name="Avg Progress (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">No data available</div>
          )}
        </div>
      </div>
    </div>
  )
}

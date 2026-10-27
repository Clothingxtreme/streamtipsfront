"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { EmptyState, formatNairaTick } from "@/components/dashboard/page-kit"

export interface EarningsDataPoint {
  label: string
  amount: number
}

interface EarningsChartProps {
  data: EarningsDataPoint[]
  title?: string
}

export function EarningsChart({ data, title = "Earnings Over Time" }: EarningsChartProps) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>
      {!data.length || data.every((point) => !point.amount) ? (
        <EmptyState title="No settled earnings yet">This chart fills in once donations settle.</EmptyState>
      ) : (
      <div className="h-[240px] w-full" role="img" aria-label={`${title} chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#71717a", fontSize: 12 }}
              width={56}
              allowDecimals={false}
              tickFormatter={(value) => formatNairaTick(Number(value))}
            />
            <Tooltip
              cursor={{ fill: "rgba(168, 85, 247, 0.1)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
                      <p className="text-white font-semibold">
                        ₦{payload[0].value?.toLocaleString()}
                      </p>
                      <p className="text-zinc-400 text-sm">
                        {payload[0].payload.label}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <Bar
              dataKey="amount"
              fill="url(#barGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </section>
  )
}

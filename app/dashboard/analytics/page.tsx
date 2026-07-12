"use client"

import { useEffect, useMemo, useState } from "react"
import type { ElementType, ReactNode } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Crown,
  Flame,
  Medal,
  Lightbulb,
  PartyPopper,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { useDonations } from "@/app/context/DonationsContext"
import { authRequest } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type DonationLike = {
  amount: number | string
  sender?: string
  senderName?: string
  createdAt?: string | Date
  date?: string | Date
  status?: string
  walletStatus?: string
  paymentStatus?: string
}

type Bucket = {
  label: string
  amount: number
  count: number
}

type PersonalRecord = {
  key: string
  title: string
  valueType: "currency" | "count" | "days" | string
  value: number
  label?: string
  occurredAt?: string
  metadata?: Record<string, unknown>
  isNew?: boolean
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const shortWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatCurrency(value: number) {
  return `NGN ${Math.round(Number(value || 0)).toLocaleString()}`
}

function formatNumber(value: number) {
  return Math.round(Number(value || 0)).toLocaleString()
}

function formatPercent(value: number) {
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${Math.round(value)}%`
}

function formatRecordValue(record: PersonalRecord) {
  if (record.valueType === "currency") return formatCurrency(record.value)
  if (record.valueType === "days") return `${formatNumber(record.value)} day${Math.round(record.value) === 1 ? "" : "s"}`
  return formatNumber(record.value)
}

function formatRecordDetail(record: PersonalRecord) {
  if (record.key === "highestDonation" && record.metadata?.donorName) {
    return `From ${String(record.metadata.donorName)}`
  }
  if (record.key === "largestSingleSupporter" && record.label) {
    return `${record.label}${record.metadata?.donations ? `, ${record.metadata.donations} donations` : ""}`
  }
  if (record.label) return record.label
  return "Waiting for more donation history"
}

function donationDate(donation: DonationLike) {
  const date = donation.createdAt || donation.date
  const parsed = date ? new Date(date) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function hourLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM"
  const normalized = hour % 12 || 12
  return `${normalized}${period}`
}

function isVisibleDonation(donation: DonationLike) {
  const walletStatus = String(donation.walletStatus || "").toLowerCase()
  const status = String(donation.status || "").toLowerCase()
  const paymentStatus = String(donation.paymentStatus || "").toUpperCase()

  if (walletStatus === "rejected" || status === "failed") return false
  return paymentStatus === "PAID" || status === "completed" || status === "pending" || !paymentStatus
}

function getSenderName(donation: DonationLike) {
  return String(donation.senderName || donation.sender || "Anonymous").trim() || "Anonymous"
}

function biggest<T>(items: T[], score: (item: T) => number): T | null {
  if (!items.length) return null
  return items.reduce((best, item) => (score(item) > score(best) ? item : best), items[0])
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: ElementType
}) {
  return (
    <div className="rounded-xl bg-zinc-900/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-500">{helper}</p>
    </div>
  )
}

function PersonalRecordCard({ record }: { record: PersonalRecord }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5",
        record.isNew
          ? "border-amber-300/30 bg-gradient-to-br from-amber-300/14 via-zinc-900/90 to-fuchsia-500/10 shadow-[0_0_40px_rgba(251,191,36,0.08)]"
          : "border-white/10 bg-zinc-900/80",
      )}
    >
      {record.isNew ? (
        <div className="absolute right-0 top-0 h-24 w-24 bg-amber-300/10 blur-2xl" />
      ) : null}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">{record.title}</p>
          <p className="mt-2 text-2xl font-black text-white">{formatRecordValue(record)}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{formatRecordDetail(record)}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", record.isNew ? "bg-amber-300/15 text-amber-200" : "bg-white/5 text-zinc-300")}>
          <Medal className="h-5 w-5" />
        </div>
      </div>
      {record.isNew ? (
        <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-black text-amber-100">
          <PartyPopper className="h-3.5 w-3.5" />
          New Personal Record!
        </div>
      ) : null}
    </div>
  )
}

function InsightCard({ text, tone = "cyan" }: { text: string; tone?: "cyan" | "emerald" | "amber" | "purple" }) {
  const tones = {
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-100",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-100",
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-100",
  }

  return (
    <div className={cn("rounded-xl border p-4", tones[tone])}>
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm leading-6">{text}</p>
      </div>
    </div>
  )
}

function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-zinc-900/80 p-5">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-5 h-[280px]">{children}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { donations } = useDonations()
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])
  const [newPersonalRecords, setNewPersonalRecords] = useState<PersonalRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    setRecordsLoading(true)
    void authRequest("/personal-records")
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return
        const records = Array.isArray(payload?.personalRecords?.records)
          ? payload.personalRecords.records
          : []
        setPersonalRecords(records)
        setNewPersonalRecords(
          Array.isArray(payload?.personalRecords?.newRecords)
            ? payload.personalRecords.newRecords
            : records.filter((record: PersonalRecord) => record.isNew),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setPersonalRecords([])
          setNewPersonalRecords([])
        }
      })
      .finally(() => {
        if (!cancelled) setRecordsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [donations.length])

  const analytics = useMemo(() => {
    const clean = donations
      .filter(isVisibleDonation)
      .map((donation) => ({
        ...donation,
        amountNumber: Math.max(0, Number(donation.amount) || 0),
        dateObject: donationDate(donation),
        senderName: getSenderName(donation),
      }))
      .filter((donation) => donation.amountNumber > 0)

    const daily = new Map<string, Bucket>()
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      label: hourLabel(hour),
      hour,
      amount: 0,
      count: 0,
    }))
    const weekday = weekdays.map((label, index) => ({
      label: shortWeekdays[index],
      fullLabel: label,
      amount: 0,
      count: 0,
    }))
    const supporter = new Map<string, { name: string; amount: number; count: number }>()
    const monthly = new Map<string, { amount: number; count: number }>()

    clean.forEach((donation) => {
      const dayKey = dateKey(donation.dateObject)
      const day = daily.get(dayKey) || { label: dayKey, amount: 0, count: 0 }
      day.amount += donation.amountNumber
      day.count += 1
      daily.set(dayKey, day)

      const hour = donation.dateObject.getHours()
      hourly[hour].amount += donation.amountNumber
      hourly[hour].count += 1

      const weekdayIndex = donation.dateObject.getDay()
      weekday[weekdayIndex].amount += donation.amountNumber
      weekday[weekdayIndex].count += 1

      const currentSupporter = supporter.get(donation.senderName) || {
        name: donation.senderName,
        amount: 0,
        count: 0,
      }
      currentSupporter.amount += donation.amountNumber
      currentSupporter.count += 1
      supporter.set(donation.senderName, currentSupporter)

      const key = monthKey(donation.dateObject)
      const currentMonth = monthly.get(key) || { amount: 0, count: 0 }
      currentMonth.amount += donation.amountNumber
      currentMonth.count += 1
      monthly.set(key, currentMonth)
    })

    const dailyList = Array.from(daily.values()).sort((left, right) => left.label.localeCompare(right.label))
    const supporterList = Array.from(supporter.values()).sort((left, right) => right.count - left.count || right.amount - left.amount)
    const totalAmount = clean.reduce((total, donation) => total + donation.amountNumber, 0)
    const activeDays = Math.max(1, dailyList.length)
    const activeHours = Math.max(1, hourly.filter((item) => item.count > 0).length)
    const highestDonation = biggest(clean, (donation) => donation.amountNumber)
    const highestEarningDay = biggest(dailyList, (item) => item.amount)
    const mostDonationDay = biggest(dailyList, (item) => item.count)
    const bestWeekday = biggest(weekday, (item) => item.amount)
    const bestHour = biggest(hourly, (item) => item.amount)
    const topSupporter = supporterList[0] || null
    const now = new Date()
    const currentMonth = monthly.get(monthKey(now)) || { amount: 0, count: 0 }
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonth = monthly.get(monthKey(previousMonthDate)) || { amount: 0, count: 0 }
    const growthAmountPercent = previousMonth.amount > 0
      ? ((currentMonth.amount - previousMonth.amount) / previousMonth.amount) * 100
      : currentMonth.amount > 0
        ? 100
        : 0
    const growthDonationPercent = previousMonth.count > 0
      ? ((currentMonth.count - previousMonth.count) / previousMonth.count) * 100
      : currentMonth.count > 0
        ? 100
        : 0

    const weekdayAverage = weekday.reduce((total, item) => total + item.amount, 0) / Math.max(1, weekday.filter((item) => item.amount > 0).length)
    const bestWeekdayLift = bestWeekday && weekdayAverage > 0 ? ((bestWeekday.amount - weekdayAverage) / weekdayAverage) * 100 : 0
    const avgDonation = clean.length ? totalAmount / clean.length : 0
    const previousAverage = previousMonth.count ? previousMonth.amount / previousMonth.count : 0
    const currentAverage = currentMonth.count ? currentMonth.amount / currentMonth.count : avgDonation
    const avgDonationChange = previousAverage > 0 ? ((currentAverage - previousAverage) / previousAverage) * 100 : 0

    const last14Days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (13 - index))
      const key = dateKey(date)
      const item = daily.get(key)
      return {
        label: date.toLocaleDateString("en-NG", { day: "2-digit", month: "short" }),
        amount: item?.amount || 0,
        count: item?.count || 0,
      }
    })

    const insights = [
      bestWeekday && bestWeekdayLift > 0
        ? `${bestWeekday.fullLabel} generated ${Math.round(bestWeekdayLift)}% more donation value than your active-day average.`
        : "Your strongest weekday will appear after more donation activity.",
      avgDonationChange
        ? `Your average donation ${avgDonationChange > 0 ? "increased" : "dropped"} by ${Math.abs(Math.round(avgDonationChange))}% compared with the previous month.`
        : "Your average donation is stable compared with the previous month.",
      bestHour && bestHour.count
        ? `${bestHour.label} is your strongest earning hour, with ${formatCurrency(bestHour.amount)} received.`
        : "Your best earning hour will appear once donations start coming in.",
      topSupporter
        ? `${topSupporter.name} is your most active supporter with ${topSupporter.count} donation${topSupporter.count === 1 ? "" : "s"}.`
        : "Most active supporter insight will appear after your first supporter donation.",
    ]

    return {
      clean,
      dailyList,
      hourly,
      weekday,
      last14Days,
      totalAmount,
      avgDonation,
      avgPerDay: totalAmount / activeDays,
      avgPerHour: totalAmount / activeHours,
      highestDonation,
      highestEarningDay,
      mostDonationDay,
      bestWeekday,
      bestHour,
      topSupporter,
      growthAmountPercent,
      growthDonationPercent,
      insights,
    }
  }, [donations])

  return (
    <div className="space-y-6 p-5 sm:p-6 lg:p-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Creator performance</p>
        <h1 className="mt-2 text-3xl font-black text-white">Analytics</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Spot your best times, strongest supporters, donation patterns, and growth signals without turning this into an accounting page.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Best Day"
          value={analytics.bestWeekday?.fullLabel || "Not enough data"}
          helper={analytics.bestWeekday ? `${formatCurrency(analytics.bestWeekday.amount)} from ${formatNumber(analytics.bestWeekday.count)} donations.` : "Needs donation activity."}
          icon={CalendarDays}
        />
        <StatCard
          label="Best Hour"
          value={analytics.bestHour?.count ? analytics.bestHour.label : "Not enough data"}
          helper={analytics.bestHour?.count ? `${formatCurrency(analytics.bestHour.amount)} received in this hour.` : "Needs donation activity."}
          icon={Clock3}
        />
        <StatCard
          label="Average Donation"
          value={formatCurrency(analytics.avgDonation)}
          helper="Average supporter gift size across visible donations."
          icon={Wallet}
        />
        <StatCard
          label="Growth vs Previous Month"
          value={formatPercent(analytics.growthAmountPercent)}
          helper={`${formatPercent(analytics.growthDonationPercent)} donation count movement.`}
          icon={TrendingUp}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average Earnings Per Day"
          value={formatCurrency(analytics.avgPerDay)}
          helper="Based on days with donation activity."
          icon={BarChart3}
        />
        <StatCard
          label="Average Earnings Per Hour"
          value={formatCurrency(analytics.avgPerHour)}
          helper="Based on hours where donations happened."
          icon={Clock3}
        />
        <StatCard
          label="Highest Donation"
          value={analytics.highestDonation ? formatCurrency(analytics.highestDonation.amountNumber) : "None yet"}
          helper={analytics.highestDonation ? `From ${analytics.highestDonation.senderName}.` : "No donation recorded yet."}
          icon={Crown}
        />
        <StatCard
          label="Most Active Supporter"
          value={analytics.topSupporter?.name || "None yet"}
          helper={analytics.topSupporter ? `${analytics.topSupporter.count} donations worth ${formatCurrency(analytics.topSupporter.amount)}.` : "No supporter pattern yet."}
          icon={Users}
        />
      </section>

      <section className="rounded-xl bg-zinc-900/80 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Medal className="h-5 w-5 text-amber-300" />
              <h2 className="text-xl font-black text-white">Personal Records</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Your best creator achievements, automatically calculated from donation history.
            </p>
          </div>
          {newPersonalRecords.length ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-300/15 px-3 py-1.5 text-sm font-black text-amber-100">
              <PartyPopper className="h-4 w-4" />
              {newPersonalRecords.length} new record{newPersonalRecords.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>

        {recordsLoading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl bg-black/20" />
            ))}
          </div>
        ) : personalRecords.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {personalRecords.map((record) => (
              <PersonalRecordCard key={record.key} record={record} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-zinc-800 bg-black/20 p-5 text-sm text-zinc-400">
            Personal records will appear after the first donation history sync.
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartShell title="Donation momentum">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.last14Days} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.48} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip
                cursor={{ stroke: "rgba(34,211,238,0.25)" }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
                    <p className="font-semibold text-white">{formatCurrency(Number(payload[0].value || 0))}</p>
                    <p className="text-xs text-zinc-400">{payload[0].payload.count} donations</p>
                  </div>
                ) : null}
              />
              <Area type="monotone" dataKey="amount" stroke="#22d3ee" strokeWidth={2} fill="url(#analyticsAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Best hours">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.hourly} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" interval={2} axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip
                cursor={{ fill: "rgba(168,85,247,0.08)" }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
                    <p className="font-semibold text-white">{formatCurrency(Number(payload[0].value || 0))}</p>
                    <p className="text-xs text-zinc-400">{payload[0].payload.count} donations at {payload[0].payload.label}</p>
                  </div>
                ) : null}
              />
              <Bar dataKey="amount" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </section>

      <section className="rounded-xl bg-zinc-900/80 p-5">
          <div className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-amber-300" />
            <h2 className="text-lg font-bold text-white">AI-style insights</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InsightCard text={analytics.insights[0]} tone="cyan" />
            <InsightCard text={analytics.insights[1]} tone="emerald" />
            <InsightCard text={analytics.insights[2]} tone="purple" />
            <InsightCard text={analytics.insights[3]} tone="amber" />
          </div>
      </section>

      <section className="rounded-xl bg-zinc-900/80 p-5">
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-pink-300" />
          <h2 className="text-lg font-bold text-white">Weekday performance</h2>
        </div>
        <div className="mt-5 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.weekday} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
              <Tooltip
                cursor={{ fill: "rgba(236,72,153,0.08)" }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
                    <p className="font-semibold text-white">{formatCurrency(Number(payload[0].value || 0))}</p>
                    <p className="text-xs text-zinc-400">{payload[0].payload.fullLabel}</p>
                  </div>
                ) : null}
              />
              <Bar dataKey="amount" fill="#ec4899" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

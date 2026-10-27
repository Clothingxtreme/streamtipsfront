"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
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
import { Sparkles } from "lucide-react"
import { useDonations } from "@/app/context/DonationsContext"
import { authRequest } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { EmptyState, MetricRow, PageHeader, PageShell, Panel, formatNairaTick } from "@/components/dashboard/page-kit"

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

function PersonalRecordTile({ record }: { record: PersonalRecord }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        record.isNew ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/[0.06] bg-zinc-950/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-zinc-500">{record.title}</p>
        {record.isNew ? (
          <span className="shrink-0 rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
            New
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{formatRecordValue(record)}</p>
      <p className="truncate text-xs text-zinc-500">{formatRecordDetail(record)}</p>
    </div>
  )
}

function ChartShell({ title, description, empty, children }: { title: string; description?: string; empty?: boolean; children: ReactNode }) {
  return (
    <Panel title={title} description={description}>
      {empty ? (
        <EmptyState title="No donation data yet">This chart fills in as supporters send tips.</EmptyState>
      ) : (
        <div className="h-[240px]" role="img" aria-label={`${title} chart`}>
          {children}
        </div>
      )}
    </Panel>
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
    // Only compare months when the previous month actually had donations; otherwise there is nothing to compare.
    const growthAmountPercent: number | null = previousMonth.amount > 0
      ? ((currentMonth.amount - previousMonth.amount) / previousMonth.amount) * 100
      : null
    const growthDonationPercent: number | null = previousMonth.count > 0
      ? ((currentMonth.count - previousMonth.count) / previousMonth.count) * 100
      : null

    const weekdayAverage = weekday.reduce((total, item) => total + item.amount, 0) / Math.max(1, weekday.filter((item) => item.amount > 0).length)
    const bestWeekdayLift = bestWeekday && weekdayAverage > 0 ? ((bestWeekday.amount - weekdayAverage) / weekdayAverage) * 100 : 0
    const avgDonation = clean.length ? totalAmount / clean.length : 0
    const previousAverage = previousMonth.count ? previousMonth.amount / previousMonth.count : 0
    // Compare this month's average only against a real previous-month average (no all-time fallback).
    const currentAverage = currentMonth.count ? currentMonth.amount / currentMonth.count : 0
    const avgDonationChange: number | null =
      previousAverage > 0 && currentMonth.count > 0 ? ((currentAverage - previousAverage) / previousAverage) * 100 : null

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
      avgDonationChange === null
        ? "Average-donation trends appear once you have donations in both this month and last month."
        : Math.round(avgDonationChange) === 0
          ? "Your average donation is about the same as last month."
          : `Your average donation ${avgDonationChange > 0 ? "increased" : "dropped"} by ${Math.abs(Math.round(avgDonationChange))}% compared with last month.`,
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
      currentMonth,
      previousMonth,
      insights,
    }
  }, [donations])

  const hasData = analytics.clean.length > 0
  const tooltipBox = "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl"
  const axisTick = { fill: "#71717a", fontSize: 12 }
  const monthComparison =
    analytics.growthAmountPercent === null || analytics.currentMonth.amount === 0
      ? analytics.previousMonth.amount > 0
        ? `Last month: ${formatCurrency(analytics.previousMonth.amount)}`
        : "No donations last month to compare"
      : `${formatPercent(analytics.growthAmountPercent)} vs last month (${formatCurrency(analytics.previousMonth.amount)})`

  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="When supporters give, how much, and who gives most. Based on your confirmed and pending donations."
      />

      <Panel>
        <MetricRow
          metrics={[
            { label: "Total received", value: formatCurrency(analytics.totalAmount), hint: `${formatNumber(analytics.clean.length)} donations` },
            { label: "Average donation", value: hasData ? formatCurrency(analytics.avgDonation) : "—" },
            {
              label: "This month",
              value: formatCurrency(analytics.currentMonth.amount),
              hint: monthComparison,
            },
            {
              label: "Average per active day",
              value: hasData ? formatCurrency(analytics.avgPerDay) : "—",
              hint: hasData ? `${formatCurrency(analytics.avgPerHour)} per active hour` : undefined,
            },
          ]}
        />
        <div className="mt-5 border-t border-white/[0.06] pt-5">
          <MetricRow
            metrics={[
              {
                label: "Best day",
                value: analytics.bestWeekday?.amount ? analytics.bestWeekday.fullLabel : "—",
                hint: analytics.bestWeekday?.amount ? `${formatCurrency(analytics.bestWeekday.amount)} from ${formatNumber(analytics.bestWeekday.count)} donations` : "Needs donation activity",
              },
              {
                label: "Best hour",
                value: analytics.bestHour?.count ? analytics.bestHour.label : "—",
                hint: analytics.bestHour?.count ? `${formatCurrency(analytics.bestHour.amount)} received` : "Needs donation activity",
              },
              {
                label: "Highest donation",
                value: analytics.highestDonation ? formatCurrency(analytics.highestDonation.amountNumber) : "—",
                hint: analytics.highestDonation ? `From ${analytics.highestDonation.senderName}` : "No donation yet",
              },
              {
                label: "Most active supporter",
                value: analytics.topSupporter?.name || "—",
                hint: analytics.topSupporter ? `${analytics.topSupporter.count} donations, ${formatCurrency(analytics.topSupporter.amount)}` : "No supporter yet",
              },
            ]}
          />
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartShell title="Last 14 days" description="Donation value per day." empty={!hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.last14Days} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis width={56} allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(value) => formatNairaTick(Number(value))} />
              <Tooltip
                cursor={{ stroke: "rgba(168,85,247,0.3)" }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className={tooltipBox}>
                    <p className="font-semibold text-white">{formatCurrency(Number(payload[0].value || 0))}</p>
                    <p className="text-xs text-zinc-400">{payload[0].payload.label} · {payload[0].payload.count} donations</p>
                  </div>
                ) : null}
              />
              <Area type="monotone" dataKey="amount" stroke="#c084fc" strokeWidth={2} fill="url(#analyticsAmount)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Best hours" description="All-time donation value by hour of day." empty={!hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.hourly} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" interval={2} axisLine={false} tickLine={false} tick={{ ...axisTick, fontSize: 11 }} />
              <YAxis width={56} allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(value) => formatNairaTick(Number(value))} />
              <Tooltip
                cursor={{ fill: "rgba(168,85,247,0.08)" }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className={tooltipBox}>
                    <p className="font-semibold text-white">{formatCurrency(Number(payload[0].value || 0))}</p>
                    <p className="text-xs text-zinc-400">{payload[0].payload.count} donations at {payload[0].payload.label}</p>
                  </div>
                ) : null}
              />
              <Bar dataKey="amount" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <ChartShell title="Weekday performance" description="All-time donation value by day of the week." empty={!hasData}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.weekday} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis width={56} allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} tickFormatter={(value) => formatNairaTick(Number(value))} />
              <Tooltip
                cursor={{ fill: "rgba(236,72,153,0.08)" }}
                content={({ active, payload }) => active && payload?.length ? (
                  <div className={tooltipBox}>
                    <p className="font-semibold text-white">{formatCurrency(Number(payload[0].value || 0))}</p>
                    <p className="text-xs text-zinc-400">{payload[0].payload.fullLabel} · {payload[0].payload.count} donations</p>
                  </div>
                ) : null}
              />
              <Bar dataKey="amount" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <Panel title="Insights" description="Calculated from your donation history.">
          <ul className="space-y-3">
            {analytics.insights.map((insight) => (
              <li key={insight} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" aria-hidden />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <Panel
        title="Personal records"
        description="Your best moments so far."
        actions={
          newPersonalRecords.length ? (
            <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-semibold text-amber-100">
              {newPersonalRecords.length} new record{newPersonalRecords.length === 1 ? "" : "s"}
            </span>
          ) : null
        }
      >
        {recordsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading personal records">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[76px] animate-pulse rounded-xl bg-white/[0.04] motion-reduce:animate-none" />
            ))}
          </div>
        ) : personalRecords.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {personalRecords.map((record) => (
              <PersonalRecordTile key={record.key} record={record} />
            ))}
          </div>
        ) : (
          <EmptyState title="No personal records yet">Records appear after your first donations sync.</EmptyState>
        )}
      </Panel>
    </PageShell>
  )
}

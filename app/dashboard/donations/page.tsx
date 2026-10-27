"use client"

import { useState, useEffect, useMemo } from "react"
import type { DonationRecord } from "@/components/donations/donation-row"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import { authRequest } from "@/lib/auth-client"
import { DonorAvatar } from "@/components/donor-avatar"
import { EmptyState, MetricRow, Notice, PageHeader, PageShell, Panel, focusRing, secondaryButton } from "@/components/dashboard/page-kit"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | "completed" | "pending" | "failed"
type DateMode = "all" | "month" | "range"
type EnrichedDonation = DonationRecord & {
  creatorSettlementNetAmount: number
  transactionReference?: string
}
type TransactionLogEntry = {
  id: string
  name: string
  amount: number
  grossAmount: number
  date: Date
  status: string
  reference?: string
}

const PAGE_SIZE = 25

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-300",
  pending: "bg-amber-500/10 text-amber-300",
  failed: "bg-red-500/10 text-red-300",
}

const CREATOR_SHARE_RATE = 0.8
const MONNIFY_CREATOR_SETTLEMENT_VAT_RATE = 0.0161
const MONNIFY_SPLIT_CUTOVER_AT = new Date("2026-05-20T14:00:00+01:00")

function formatCurrency(amount: number) {
  return `NGN ${(Number(amount) || 0).toLocaleString()}`
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatMonthInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endExclusiveDay(date: Date) {
  const value = startOfDay(date)
  value.setDate(value.getDate() + 1)
  return value
}

function getCreatorSettlementNetAmount(rawDonation: any) {
  const amount = Number(rawDonation.amount) || 0
  const creatorShare =
    Number(rawDonation.creatorShare) || Math.round(amount * CREATOR_SHARE_RATE)
  const savedNet = Number(rawDonation.creatorSettlementNetAmount)
  const savedVat = Number(rawDonation.creatorSettlementVat)
  const vat =
    Number.isFinite(savedVat) && savedVat > 0
      ? savedVat
      : Math.round(creatorShare * MONNIFY_CREATOR_SETTLEMENT_VAT_RATE)

  return Number.isFinite(savedNet) && savedNet > 0
    ? savedNet
    : Math.max(0, creatorShare - vat)
}

export default function DonationsPage() {
  const [donations, setDonations] = useState<EnrichedDonation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [dateMode, setDateMode] = useState<DateMode>("all")
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")
  const [reloadKey, setReloadKey] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedMonth, setSelectedMonth] = useState(() => formatMonthInput(new Date()))
  const [startDate, setStartDate] = useState(() => formatDateInput(new Date()))
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()))

  useEffect(() => {
    const fetchRecords = async () => {
      setLoadState((current) => (current === "ready" ? current : "loading"))
      try {
        const donationsResponse = await authRequest("/donations")
        const data = await donationsResponse.json()
        if (!donationsResponse.ok || !Array.isArray(data)) {
          throw new Error((data && data.error) || "Could not load donations.")
        }
        const formatted: EnrichedDonation[] = (Array.isArray(data) ? data : []).map((d: any) => {
          const date = new Date(d.createdAt || d.date || Date.now())
          const provider = String(d.provider || "monnify").toLowerCase()
          const rawStatus = String(d.status || "").toLowerCase()
          const rawWalletStatus = String(d.walletStatus || "").toLowerCase()
          const paymentStatus = String(d.paymentStatus || "").toUpperCase()
          const fundsFlow = String(d.fundsFlow || "wallet").toLowerCase()
          const settlementStatus = String(d.settlementStatus || "").toLowerCase()
          const isLegacyBeforeSplitCutover =
            provider === "monnify" &&
            fundsFlow === "wallet" &&
            date < MONNIFY_SPLIT_CUTOVER_AT
          const isFailed =
            rawStatus === "failed" ||
            rawWalletStatus === "rejected" ||
            settlementStatus === "failed"
          const isPaidMonnifyDonation =
            provider === "monnify" &&
            paymentStatus === "PAID" &&
            rawWalletStatus !== "rejected" &&
            rawStatus !== "failed"
          const isPendingNewSettlementFlow =
            rawStatus === "pending" ||
            rawWalletStatus === "pending_review" ||
            settlementStatus === "pending" ||
            settlementStatus === "partial"

          let normalizedStatus: "completed" | "pending" | "failed" = "completed"
          if (isFailed) {
            normalizedStatus = "failed"
          } else if (isPaidMonnifyDonation) {
            normalizedStatus = "completed"
          } else if (!isLegacyBeforeSplitCutover && isPendingNewSettlementFlow) {
            normalizedStatus = "pending"
          }

          return {
            id: d.id || d._id,
            donorName: d.senderName || d.sender || "Anonymous",
            amount: Number(d.amount) || 0,
            creatorShare:
              Number(d.creatorShare) || Math.round((Number(d.amount) || 0) * CREATOR_SHARE_RATE),
            date,
            status: normalizedStatus,
            message: d.message || d.alertMessage || "",
            provider,
            transactionReference: d.transactionReference || d.paystackReference || "",
            creatorSettlementNetAmount: getCreatorSettlementNetAmount(d),
          }
        })
        setDonations(formatted)
        setLoadState("ready")
      } catch (error) {
        console.error("Failed to fetch donation records:", error)
        setLoadState((current) => (current === "ready" ? current : "error"))
      }
    }

    fetchRecords()
  }, [reloadKey])

  const dateWindow = useMemo(() => {
    if (dateMode === "all") {
      return { start: new Date(0), end: new Date(8.64e15) }
    }

    if (dateMode === "range") {
      const start = startOfDay(new Date(startDate || Date.now()))
      const end = endExclusiveDay(new Date(endDate || startDate || Date.now()))
      return start <= end ? { start, end } : { start: end, end: endExclusiveDay(start) }
    }

    const [yearText, monthText] = selectedMonth.split("-")
    const year = Number(yearText) || new Date().getFullYear()
    const month = Math.max(0, (Number(monthText) || new Date().getMonth() + 1) - 1)
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 1),
    }
  }, [dateMode, endDate, selectedMonth, startDate])

  const transactionEntries = useMemo<TransactionLogEntry[]>(() => {
    const query = searchQuery.toLowerCase().trim()
    const parsedMin = minAmount === "" ? null : Number(minAmount)
    const parsedMax = maxAmount === "" ? null : Number(maxAmount)
    const donationEntries: TransactionLogEntry[] = donations
      .filter((donation) => donation.date >= dateWindow.start && donation.date < dateWindow.end)
      .filter((donation) => statusFilter === "all" || donation.status === statusFilter)
      .filter((donation) => parsedMin === null || Number.isNaN(parsedMin) || donation.amount >= parsedMin)
      .filter((donation) => parsedMax === null || Number.isNaN(parsedMax) || donation.amount <= parsedMax)
      .map((donation) => ({
        id: `in-${donation.id}`,
        name: donation.donorName || "Anonymous",
        amount: donation.creatorSettlementNetAmount,
        grossAmount: donation.amount,
        date: donation.date,
        status: donation.status,
        reference: donation.transactionReference,
      }))

    return donationEntries
      .filter((entry) => {
        if (!query) return true
        return (
          entry.name.toLowerCase().includes(query) ||
          String(entry.reference || "").toLowerCase().includes(query) ||
          entry.status.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [dateWindow.end, dateWindow.start, donations, maxAmount, minAmount, searchQuery, statusFilter])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [dateWindow.end, dateWindow.start, maxAmount, minAmount, searchQuery, statusFilter])

  const transactionSummary = useMemo(() => {
    return transactionEntries.reduce((sum, entry) => sum + entry.amount, 0)
  }, [transactionEntries])

  const stats = useMemo(() => {
    const total = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
    const streamerIncome = donations.reduce(
      (sum, d) => sum + (Number(d.creatorShare) || Math.round((Number(d.amount) || 0) * CREATOR_SHARE_RATE)),
      0,
    )
    const completed = donations.filter((d) => d.status === "completed").length
    return { total, streamerIncome, completed, count: donations.length }
  }, [donations])

  const inputClass =
    "h-10 border-white/10 bg-zinc-950/60 text-white placeholder:text-zinc-500 focus-visible:border-purple-400/60 focus-visible:ring-purple-500/20"
  const filtersActive = Boolean(searchQuery || statusFilter !== "all" || minAmount || maxAmount || dateMode !== "all")

  return (
    <PageShell data-tour="donations-main">
      <PageHeader title="Donations" description="Every tip you've received, newest first." />

      <Panel>
        <MetricRow
          metrics={[
            { label: "Total received", value: formatCurrency(stats.total), hint: "What supporters sent" },
            { label: "Your share", value: formatCurrency(stats.streamerIncome), hint: "After the platform fee" },
            { label: "Completed", value: `${stats.completed.toLocaleString()} of ${stats.count.toLocaleString()}`, hint: "Donations confirmed" },
          ]}
        />
      </Panel>

      <Panel
        title="Transaction history"
        description="Net amounts are your share after the platform fee and Monnify VAT (1.61–2.02%)."
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
              <label htmlFor="donation-search" className="sr-only">Search donations</label>
              <Input
                id="donation-search"
                placeholder="Search donor, reference or status"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(inputClass, "pl-9")}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger aria-label="Status" className={cn(inputClass, "col-span-2 w-full lg:col-span-1")}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                {[
                  ["all", "All statuses"],
                  ["completed", "Completed"],
                  ["pending", "Pending"],
                  ["failed", "Failed"],
                ].map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-white focus:bg-zinc-800 focus:text-white">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              aria-label="Minimum amount"
              placeholder="Min amount"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className={inputClass}
            />
            <Input
              type="number"
              min="0"
              inputMode="numeric"
              aria-label="Maximum amount"
              placeholder="Max amount"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div role="radiogroup" aria-label="Period" className="inline-flex w-fit rounded-xl border border-white/10 bg-zinc-950/60 p-1">
              {([
                ["all", "All time"],
                ["month", "Month"],
                ["range", "Date range"],
              ] as Array<[DateMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={dateMode === mode}
                  onClick={() => setDateMode(mode)}
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs font-medium transition-colors",
                    focusRing,
                    dateMode === mode ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {dateMode === "month" ? (
              <Input
                type="month"
                aria-label="Month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className={cn(inputClass, "[color-scheme:dark] sm:w-48")}
              />
            ) : null}
            {dateMode === "range" ? (
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Input
                  type="date"
                  aria-label="Start date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={cn(inputClass, "[color-scheme:dark] sm:w-44")}
                />
                <Input
                  type="date"
                  aria-label="End date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={cn(inputClass, "[color-scheme:dark] sm:w-44")}
                />
              </div>
            ) : null}
            <p className="text-sm text-zinc-400 sm:ml-auto" aria-live="polite">
              {transactionEntries.length.toLocaleString()} result{transactionEntries.length === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold text-emerald-300">+{formatCurrency(transactionSummary)}</span> net
            </p>
          </div>
        </div>

        <div className="mt-4">
          {loadState === "loading" && !donations.length ? (
            <ul className="space-y-3" aria-label="Loading donations">
              {Array.from({ length: 4 }).map((_, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
                  <div className="h-3 flex-1 animate-pulse rounded bg-white/[0.06] motion-reduce:animate-none" />
                </li>
              ))}
            </ul>
          ) : loadState === "error" && !donations.length ? (
            <Notice
              tone="error"
              action={
                <button type="button" onClick={() => setReloadKey((key) => key + 1)} className={cn(secondaryButton, "h-8 px-3 text-xs")}>
                  Try again
                </button>
              }
            >
              We couldn&apos;t load your donations.
            </Notice>
          ) : transactionEntries.length ? (
            <>
              <ul className="divide-y divide-white/[0.06]">
                {transactionEntries.slice(0, visibleCount).map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-3">
                    <DonorAvatar name={entry.name} className="h-9 w-9 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{entry.name}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                        <time dateTime={entry.date.toISOString()}>
                          {entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })},{" "}
                          {entry.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </time>
                        {entry.reference ? <span className="hidden truncate font-mono sm:inline">{entry.reference}</span> : null}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-emerald-300">+{formatCurrency(entry.amount)}</p>
                      <p className="flex items-center justify-end gap-2 text-xs text-zinc-500">
                        <span className="hidden sm:inline">of {formatCurrency(entry.grossAmount)}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", statusStyles[entry.status] || "bg-white/5 text-zinc-300")}>
                          {entry.status}
                        </span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              {transactionEntries.length > visibleCount ? (
                <div className="mt-3 flex justify-center">
                  <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className={secondaryButton}>
                    Show more ({(transactionEntries.length - visibleCount).toLocaleString()} left)
                  </button>
                </div>
              ) : null}
            </>
          ) : donations.length ? (
            <EmptyState
              title="No donations match these filters"
              action={
                filtersActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("")
                      setStatusFilter("all")
                      setMinAmount("")
                      setMaxAmount("")
                      setDateMode("all")
                    }}
                    className={secondaryButton}
                  >
                    Clear filters
                  </button>
                ) : null
              }
            >
              Try a different period, status or amount.
            </EmptyState>
          ) : (
            <EmptyState title="No donations yet">Tips will appear here as soon as supporters send them.</EmptyState>
          )}
        </div>
      </Panel>
    </PageShell>
  )
}

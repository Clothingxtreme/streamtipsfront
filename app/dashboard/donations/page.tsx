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
import { Button } from "@/components/ui/button"
import { ArrowDownLeft, CalendarSearch, Filter, Search, TrendingUp, Wallet } from "lucide-react"
import { authRequest } from "@/lib/auth-client"

type StatusFilter = "all" | "completed" | "pending" | "failed"
type DateMode = "month" | "range"
type EnrichedDonation = DonationRecord & {
  creatorSettlementNetAmount: number
  transactionReference?: string
}
type TransactionLogEntry = {
  id: string
  name: string
  amount: number
  date: Date
  status: string
  reference?: string
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
  const [dateMode, setDateMode] = useState<DateMode>("month")
  const [selectedMonth, setSelectedMonth] = useState(() => formatMonthInput(new Date()))
  const [startDate, setStartDate] = useState(() => formatDateInput(new Date()))
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()))

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const donationsResponse = await authRequest("/donations")
        const data = await donationsResponse.json()
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
      } catch (error) {
        console.error("Failed to fetch donation records:", error)
      }
    }

    fetchRecords()
  }, [])

  const dateWindow = useMemo(() => {
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

  const filteredDonations = useMemo(() => {
    let result = [...donations]
    const parsedMin = minAmount === "" ? null : Number(minAmount)
    const parsedMax = maxAmount === "" ? null : Number(maxAmount)

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((d) => d.donorName.toLowerCase().includes(query))
    }

    if (statusFilter !== "all") {
      result = result.filter((d) => d.status === statusFilter)
    }

    if (parsedMin !== null && !Number.isNaN(parsedMin)) {
      result = result.filter((d) => d.amount >= parsedMin)
    }

    if (parsedMax !== null && !Number.isNaN(parsedMax)) {
      result = result.filter((d) => d.amount <= parsedMax)
    }

    result.sort((a, b) => b.date.getTime() - a.date.getTime())
    return result
  }, [donations, maxAmount, minAmount, searchQuery, statusFilter])

  const transactionEntries = useMemo<TransactionLogEntry[]>(() => {
    const query = searchQuery.toLowerCase().trim()
    const donationEntries: TransactionLogEntry[] = donations
      .filter((donation) => donation.date >= dateWindow.start && donation.date < dateWindow.end)
      .map((donation) => ({
        id: `in-${donation.id}`,
        name: donation.donorName || "Anonymous",
        amount: donation.creatorSettlementNetAmount,
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
  }, [dateWindow.end, dateWindow.start, donations, searchQuery])

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

  return (
    <div data-tour="donations-main" className="p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Donations</h1>
        <p className="text-zinc-500">View and manage all your donation history.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Total Received</p>
            <p className="text-xl font-bold text-white">
              NGN {(Number(stats.total) || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Streamer Income (80%)</p>
            <p className="text-xl font-bold text-white">
              NGN {(Number(stats.streamerIncome) || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Completed</p>
            <p className="text-xl font-bold text-white">{stats.completed} donations</p>
          </div>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Filter className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Showing</p>
            <p className="text-xl font-bold text-white">
              {filteredDonations.length} of {stats.count}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by donor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full xl:w-[160px] bg-zinc-900/80 border-zinc-800 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-white focus:bg-zinc-800 focus:text-white">
              All Status
            </SelectItem>
            <SelectItem value="completed" className="text-white focus:bg-zinc-800 focus:text-white">
              Completed
            </SelectItem>
            <SelectItem value="pending" className="text-white focus:bg-zinc-800 focus:text-white">
              Pending
            </SelectItem>
            <SelectItem value="failed" className="text-white focus:bg-zinc-800 focus:text-white">
              Failed
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <Input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-full sm:w-[160px] bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
          />
          <Input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="w-full sm:w-[160px] bg-zinc-900/80 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white">
              <CalendarSearch className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold">Transaction Log</h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Track net money in after StreamTip&apos;s 20% and Monnify&apos;s 1.61-2.02% V.A.T.
            </p>
          </div>
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
            <Button
              type="button"
              onClick={() => setDateMode("month")}
              className={`h-9 px-4 ${dateMode === "month" ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
            >
              Month
            </Button>
            <Button
              type="button"
              onClick={() => setDateMode("range")}
              className={`h-9 px-4 ${dateMode === "range" ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
            >
              Range
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr_1fr]">
          {dateMode === "month" ? (
            <Input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="bg-zinc-900/80 border-zinc-800 text-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
            />
          ) : (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="bg-zinc-900/80 border-zinc-800 text-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="bg-zinc-900/80 border-zinc-800 text-white focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20"
              />
            </>
          )}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs text-zinc-500">In</p>
            <p className="mt-1 text-lg font-black text-emerald-300">{formatCurrency(transactionSummary)}</p>
          </div>
        </div>

        <div className="divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
          {transactionEntries.length ? (
            transactionEntries.slice(0, 12).map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{entry.name}</p>
                  <p className="text-xs text-zinc-500">
                    {entry.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    <span className="ml-2">{entry.status}</span>
                  </p>
                </div>
                <p className="text-sm font-black text-emerald-300">
                  +{formatCurrency(entry.amount)}
                </p>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No transactions found for this period.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

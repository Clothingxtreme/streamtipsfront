"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Coins, Filter, Landmark, Wallet } from "lucide-react"
import { adminRequest } from "@/lib/admin-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PlatformRevenueRecord = {
  id: string
  donationId: string
  creatorId: string
  creatorName: string
  creatorEmail: string
  sender: string
  amount: number
  platformFee: number
  provider: string
  paymentStatus: string
  walletStatus: string
  settlementStatus: string
  transactionReference: string
  date?: string
  createdAt?: string
}

type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

type PlatformRevenueResponse = {
  records: PlatformRevenueRecord[]
  pagination: PaginationMeta
  filters: {
    q: string
    dateFrom: string
    dateTo: string
  }
  totals: {
    filteredGrossRevenue: number
    filteredPlatformRevenue: number
    allTimePlatformRevenue: number
    settledPlatformRevenue: number
    pendingPlatformRevenue: number
    totalPlatformWithdrawn: number
  }
}

type RevenueFilters = {
  q: string
  dateFrom: string
  dateTo: string
}

function formatCurrency(amount: number) {
  return `NGN ${Number(amount || 0).toLocaleString()}`
}

function formatDate(value?: string) {
  if (!value) return "Just now"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Just now"
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function toQueryString(filters: RevenueFilters, page: number, limit: number) {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("limit", String(limit))
  if (filters.q.trim()) params.set("q", filters.q.trim())
  if (filters.dateFrom.trim()) params.set("dateFrom", filters.dateFrom.trim())
  if (filters.dateTo.trim()) params.set("dateTo", filters.dateTo.trim())
  return params.toString()
}

export default function PlatformRevenuePage() {
  const [records, setRecords] = useState<PlatformRevenueRecord[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  })
  const [totals, setTotals] = useState<PlatformRevenueResponse["totals"]>({
    filteredGrossRevenue: 0,
    filteredPlatformRevenue: 0,
    allTimePlatformRevenue: 0,
    settledPlatformRevenue: 0,
    pendingPlatformRevenue: 0,
    totalPlatformWithdrawn: 0,
  })
  const [filters, setFilters] = useState<RevenueFilters>({
    q: "",
    dateFrom: "",
    dateTo: "",
  })
  const [appliedFilters, setAppliedFilters] = useState<RevenueFilters>({
    q: "",
    dateFrom: "",
    dateTo: "",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadRevenue = async (page = pagination.page, nextFilters = appliedFilters) => {
    setLoading(true)
    setError("")

    try {
      const query = toQueryString(nextFilters, page, pagination.limit)
      const response = await adminRequest(`/admin/platform-revenue?${query}`)
      const payload = (await response.json().catch(() => null)) as PlatformRevenueResponse | null

      if (!response.ok) {
        throw new Error((payload as any)?.error || "Could not load platform revenue.")
      }

      setRecords(Array.isArray(payload?.records) ? payload.records : [])
      setPagination({
        page: Number(payload?.pagination?.page) || page,
        limit: Number(payload?.pagination?.limit) || pagination.limit,
        total: Number(payload?.pagination?.total) || 0,
        totalPages: Math.max(1, Number(payload?.pagination?.totalPages) || 1),
        hasPrevious: Boolean(payload?.pagination?.hasPrevious),
        hasNext: Boolean(payload?.pagination?.hasNext),
      })
      setTotals({
        filteredGrossRevenue: Number(payload?.totals?.filteredGrossRevenue || 0),
        filteredPlatformRevenue: Number(payload?.totals?.filteredPlatformRevenue || 0),
        allTimePlatformRevenue: Number(payload?.totals?.allTimePlatformRevenue || 0),
        settledPlatformRevenue: Number(payload?.totals?.settledPlatformRevenue || 0),
        pendingPlatformRevenue: Number(payload?.totals?.pendingPlatformRevenue || 0),
        totalPlatformWithdrawn: Number(payload?.totals?.totalPlatformWithdrawn || 0),
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Could not load platform revenue.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRevenue(1, appliedFilters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white">Platform Revenue</h1>
        <p className="text-zinc-400">
          Track all-time platform 20% earnings and inspect donation-level revenue with date filters.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Coins}
          label="All-time platform revenue"
          value={formatCurrency(totals.allTimePlatformRevenue)}
        />
        <MetricCard
          icon={Filter}
          label="Filtered platform revenue"
          value={formatCurrency(totals.filteredPlatformRevenue)}
        />
        <MetricCard
          icon={Wallet}
          label="Settled platform revenue"
          value={formatCurrency(totals.settledPlatformRevenue)}
        />
        <MetricCard
          icon={Landmark}
          label="Available now"
          value={formatCurrency(totals.pendingPlatformRevenue)}
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white">Filters</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
          <FilterField label="Search">
            <Input
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Sender, creator, or reference"
              className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
            />
          </FilterField>
          <FilterField label="Date from">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateFrom: event.target.value }))
              }
              className="border-zinc-700 bg-zinc-950/70 text-white"
            />
          </FilterField>
          <FilterField label="Date to">
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({ ...current, dateTo: event.target.value }))
              }
              className="border-zinc-700 bg-zinc-950/70 text-white"
            />
          </FilterField>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setAppliedFilters(filters)
                void loadRevenue(1, filters)
              }}
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const resetFilters = { q: "", dateFrom: "", dateTo: "" }
                setFilters(resetFilters)
                setAppliedFilters(resetFilters)
                void loadRevenue(1, resetFilters)
              }}
              disabled={loading}
              className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
            >
              Reset
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-white">Revenue Ledger</h2>
          <p className="text-xs text-zinc-400">
            Page {pagination.page} of {pagination.totalPages} • {pagination.total.toLocaleString()} donations
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
              Loading platform revenue...
            </div>
          ) : records.length ? (
            records.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{record.sender || "Anonymous"}</p>
                    <p className="truncate text-sm text-zinc-500">
                      Creator: {record.creatorName} ({record.creatorEmail || "no email"})
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-600">
                      Ref: {record.transactionReference || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-400">Gift: {formatCurrency(record.amount)}</p>
                    <p className="text-sm font-semibold text-cyan-200">
                      Platform: {formatCurrency(record.platformFee)}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(record.createdAt || record.date)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em]">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300">
                    {record.provider || "unknown"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300">
                    {record.walletStatus || "available"}
                  </span>
                  {record.settlementStatus ? (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-200">
                      {record.settlementStatus}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
              No revenue records for this filter.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-400">
            Filtered gross: {formatCurrency(totals.filteredGrossRevenue)} • Filtered platform: {formatCurrency(totals.filteredPlatformRevenue)}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading || !pagination.hasPrevious}
              onClick={() => void loadRevenue(pagination.page - 1, appliedFilters)}
              className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || !pagination.hasNext}
              onClick={() => void loadRevenue(pagination.page + 1, appliedFilters)}
              className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-300">{label}</Label>
      {children}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins
  label: string
  value: string
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-white/65">{label}</p>
          <p className="mt-2 break-words text-xl font-black leading-tight text-white">{value}</p>
        </div>
        <div className="rounded-2xl bg-black/15 p-3">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

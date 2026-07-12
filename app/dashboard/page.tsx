"use client"

import Link from "next/link"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Crown,
  Gift,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useDonations } from "@/app/context/DonationsContext"
import { useAuth } from "@/app/context/AuthContext"
import { useOverlaySettings } from "@/app/context/OverlaySettingsContext"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { DonationsTable } from "@/components/dashboard/donations-table"
import { VirtualAccountCard } from "@/components/dashboard/virtual-account-card"
import { cn } from "@/lib/utils"

const fallbackVirtualAccount = {
  accountName: "No virtual account yet",
  accountNumber: "Register a user first",
  bankName: "Paystack",
}

const formatCurrency = (num: number) => {
  if (num >= 1_000_000_000) return "NGN " + (num / 1_000_000_000).toFixed(1) + "B"
  if (num >= 1_000_000) return "NGN " + (num / 1_000_000).toFixed(1) + "M"
  if (num >= 1_000) return "NGN " + (num / 1_000).toFixed(1) + "K"
  return "NGN " + num.toLocaleString()
}

const maxTier = 4

type SessionDonation = {
  amount?: number | string
  sender?: string
  senderName?: string
  createdAt?: string | Date
  date?: string | Date
  paymentStatus?: string
  walletStatus?: string
  status?: string
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
      {children}
    </p>
  )
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition-colors hover:text-white"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function StreamReadyItem({
  title,
  href,
  complete,
}: {
  title: string
  href: string
  complete: boolean
}) {
  const content = (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-4 py-3 transition-colors",
        !complete && "hover:bg-white/[0.06]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            complete ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300",
          )}
        >
          {complete ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        </div>
        <p className="truncate text-sm font-semibold text-white">{title}</p>
      </div>
      {complete ? (
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
          Complete
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-cyan-200">
          Fix
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  )

  if (complete) {
    return content
  }

  return (
    <Link href={href} aria-label={`Complete ${title}`}>
      {content}
    </Link>
  )
}

function SnapshotMetric({
  label,
  value,
  icon: Icon,
  helper,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  helper: string
}) {
  return (
    <div className="rounded-lg bg-zinc-950/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">{helper}</p>
    </div>
  )
}

function getDonationDate(donation: SessionDonation) {
  const value = donation.createdAt || donation.date
  const date = value ? new Date(value) : new Date(0)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

function getDonationName(donation: SessionDonation) {
  return String(donation.senderName || donation.sender || "Anonymous").trim() || "Anonymous"
}

function isReviewDonationVisible(donation: SessionDonation) {
  const walletStatus = String(donation.walletStatus || "").toLowerCase()
  const status = String(donation.status || "").toLowerCase()
  const paymentStatus = String(donation.paymentStatus || "").toUpperCase()

  if (walletStatus === "rejected" || status === "failed") return false
  return paymentStatus === "PAID" || status === "completed" || status === "pending" || !paymentStatus
}

function formatSessionDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function SessionReviewCard({
  review,
}: {
  review: {
    moneyReceived: number
    donationCount: number
    highestDonation: { amount: number; name: string } | null
    topSupporter: { name: string; amount: number; count: number } | null
    averageDonation: number
    dateRange: string
    hasPreviousVisit: boolean
  }
}) {
  const insightPrefix = review.hasPreviousVisit ? "since your last visit" : "in your tracked history"
  const highestDonationText = review.highestDonation
    ? `Your highest donation was ${formatCurrency(review.highestDonation.amount)}.`
    : "Your highest donation will appear after new activity."

  return (
    <section className="rounded-xl bg-zinc-900/70 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.16)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <SectionLabel>Session Review</SectionLabel>
          <h2 className="mt-2 text-2xl font-bold text-white">Since your previous dashboard visit</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Based only on dashboard activity windows, not livestream start or end detection.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm text-zinc-300">
          <CalendarDays className="h-4 w-4 text-cyan-200" />
          {review.dateRange}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SnapshotMetric
          label="Money Received"
          value={formatCurrency(review.moneyReceived)}
          icon={Wallet}
          helper={`Total received ${insightPrefix}.`}
        />
        <SnapshotMetric
          label="Donations"
          value={review.donationCount}
          icon={Gift}
          helper={`Donation count ${insightPrefix}.`}
        />
        <SnapshotMetric
          label="Highest Donation"
          value={review.highestDonation ? formatCurrency(review.highestDonation.amount) : "None yet"}
          icon={Crown}
          helper={review.highestDonation ? `From ${review.highestDonation.name}.` : "No donation in this window."}
        />
        <SnapshotMetric
          label="Top Supporter"
          value={review.topSupporter?.name || "None yet"}
          icon={Users}
          helper={review.topSupporter ? `${formatCurrency(review.topSupporter.amount)} across ${review.topSupporter.count} donations.` : "No supporter in this window."}
        />
        <SnapshotMetric
          label="Average Donation"
          value={formatCurrency(review.averageDonation)}
          icon={TrendingUp}
          helper="Average amount per donation in this window."
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-100">
          You received <span className="font-black">{review.donationCount}</span> donation{review.donationCount === 1 ? "" : "s"} {insightPrefix}.
        </div>
        <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
          You earned <span className="font-black">{formatCurrency(review.moneyReceived)}</span>.
        </div>
        <div className="rounded-lg border border-amber-400/15 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          {highestDonationText}
        </div>
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const { donations } = useDonations()
  const { user } = useAuth()
  const { settings: overlaySettings } = useOverlaySettings()
  const { customization } = useOverlayCustomization()
  const [previousDashboardVisitAt, setPreviousDashboardVisitAt] = useState("")

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return

    const storageKey = `streamtip.dashboard.lastVisit.${user.id}`
    const previousVisit = window.localStorage.getItem(storageKey) || ""

    setPreviousDashboardVisitAt(previousVisit)
    window.localStorage.setItem(storageKey, new Date().toISOString())
  }, [user?.id])

  const totalFromDonations = donations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0)
  const walletTotalReceived = Number(user?.wallet?.totalReceived || 0)
  const totalEarnings = Math.max(walletTotalReceived, totalFromDonations)
  const totalDonations = donations.length
  const uniqueDonors = new Set(donations.map((donation) => donation.senderName || donation.sender || "Anonymous")).size
  const avgDonation = totalDonations > 0 ? Math.round(totalFromDonations / totalDonations) : 0
  const latestDonation = donations[0]
  const account = user?.virtualAccount || fallbackVirtualAccount
  const accountReady =
    Boolean(user?.virtualAccount?.accountNumber) &&
    String(user?.virtualAccount?.status || "active").toLowerCase() !== "failed"
  const overlayReady = Boolean(user?.id)
  const donationAnimationReady = Boolean(overlaySettings.animations)
  const leaderboardReady = Boolean(customization.showLeaderboard)
  const donationGoalReady = Boolean(customization.goalTitle?.trim()) && Number(customization.goalAmount || 0) > 0
  const profileReady = Boolean(user?.name && user?.email) && Boolean(user?.socialProfile?.handle || user?.socialProfile?.profileUrl || user?.socialProfile?.liveUrl)
  const streamReadyItems = [
    { title: "Virtual Account", complete: accountReady, href: "/dashboard/account" },
    { title: "Overlay Connected", complete: overlayReady, href: "/dashboard/overlay" },
    { title: "Donation Animation", complete: donationAnimationReady, href: "/dashboard/settings" },
    { title: "Leaderboard", complete: leaderboardReady, href: "/dashboard/overlay" },
    { title: "Donation Goal", complete: donationGoalReady, href: "/dashboard/overlay" },
    { title: "Complete Profile", complete: profileReady, href: "/dashboard/settings" },
  ]
  const completedStreamReadyItems = streamReadyItems.filter((item) => item.complete).length
  const streamReadyScore = Math.round((completedStreamReadyItems / streamReadyItems.length) * 100)
  const tier = Math.min(maxTier, Math.max(1, Number(user?.kyc?.tier || user?.kycTier || 1)))
  const tierProgress = Math.round((tier / maxTier) * 100)
  const sessionReview = useMemo(() => {
    const previousVisitTime = previousDashboardVisitAt ? new Date(previousDashboardVisitAt).getTime() : 0
    const hasValidPreviousVisit = Boolean(previousVisitTime && !Number.isNaN(previousVisitTime))
    const reviewDonations = donations
      .filter(isReviewDonationVisible)
      .filter((donation) => {
        if (!hasValidPreviousVisit) return true
        return getDonationDate(donation).getTime() > previousVisitTime
      })

    const moneyReceived = reviewDonations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0)
    const highestDonation = reviewDonations.reduce<{ amount: number; name: string } | null>(
      (highest, donation) => {
        const amount = Number(donation.amount || 0)
        if (!highest || amount > highest.amount) {
          return { amount, name: getDonationName(donation) }
        }
        return highest
      },
      null,
    )
    const supporterStats = new Map<string, { name: string; amount: number; count: number }>()

    reviewDonations.forEach((donation) => {
      const name = getDonationName(donation)
      const key = name.toLowerCase()
      const current = supporterStats.get(key) || { name, amount: 0, count: 0 }
      current.amount += Number(donation.amount || 0)
      current.count += 1
      supporterStats.set(key, current)
    })

    const topSupporter =
      Array.from(supporterStats.values()).sort((a, b) => b.amount - a.amount || b.count - a.count)[0] || null
    const averageDonation = reviewDonations.length ? Math.round(moneyReceived / reviewDonations.length) : 0
    const dateRange = hasValidPreviousVisit
      ? `${formatSessionDate(previousDashboardVisitAt)} - now`
      : "All tracked dashboard activity"

    return {
      moneyReceived,
      donationCount: reviewDonations.length,
      highestDonation,
      topSupporter,
      averageDonation,
      dateRange,
      hasPreviousVisit: hasValidPreviousVisit,
    }
  }, [donations, previousDashboardVisitAt])

  return (
    <div data-tour="dashboard-main" className="space-y-8 p-5 sm:p-6 lg:p-8">
      <div className="max-w-4xl space-y-2">
        <SectionLabel>Creator overview</SectionLabel>
        <h1 className="text-3xl font-black text-white">Dashboard</h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Keep your stream ready, understand your current fee, and review the numbers that matter most before going live.
        </p>
      </div>

      <SessionReviewCard review={sessionReview} />

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-xl bg-zinc-900/70 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <SectionLabel>1. Stream Ready</SectionLabel>
              <h2 className="mt-2 text-2xl font-bold text-white">Go-live readiness</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Complete the essentials before you open OBS or TikTok Studio.
              </p>
            </div>
            <div className="min-w-[180px] rounded-xl bg-black/20 p-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Score</p>
                  <p className="mt-1 text-4xl font-black text-white">{streamReadyScore}%</p>
                </div>
                <span className="pb-1 text-sm text-zinc-400">
                  {completedStreamReadyItems}/{streamReadyItems.length}
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-zinc-800">
                <div
                  className={cn(
                    "h-full rounded-full",
                    streamReadyScore >= 80
                      ? "bg-emerald-400"
                      : streamReadyScore >= 50
                        ? "bg-amber-300"
                        : "bg-red-400",
                  )}
                  style={{ width: `${streamReadyScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {streamReadyItems.map((item) => (
              <StreamReadyItem
                key={item.title}
                title={item.title}
                href={item.href}
                complete={item.complete}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-500/15 via-zinc-900/80 to-pink-500/10 p-5 sm:p-6">
          <SectionLabel>2. Account Tier</SectionLabel>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-400">Current creator tier</p>
              <p className="mt-1 text-5xl font-black text-white">Tier {tier}</p>
            </div>
            <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
              {tier} of {maxTier}
            </div>
          </div>

          <div className="mt-6">
            <div className="rounded-lg bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Total received tracked</p>
              <p className="mt-2 text-xl font-bold text-white">{formatCurrency(totalEarnings)}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Tier progress</span>
              <span className="font-semibold text-white">Tier {tier} of {maxTier}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400"
                style={{ width: `${tierProgress}%` }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs leading-5 text-zinc-500">
                Higher tiers unlock stronger account limits and more room to grow.
              </p>
              <Link
                href="/dashboard/kyc-upgrade"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                <ShieldCheck className="h-4 w-4" />
                Upgrade
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-zinc-900/70 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionLabel>3. Performance Snapshot</SectionLabel>
            <h2 className="mt-2 text-2xl font-bold text-white">What matters right now</h2>
          </div>
          <p className="text-sm text-zinc-500">
            {latestDonation ? `Latest donation: ${formatCurrency(Number(latestDonation.amount) || 0)}` : "No donation activity yet"}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotMetric label="Total received" value={formatCurrency(totalEarnings)} icon={Wallet} helper="All-time amount received through StreamTips." />
          <SnapshotMetric label="Donations" value={totalDonations} icon={Gift} helper="Total donation events currently tracked." />
          <SnapshotMetric label="Unique donors" value={uniqueDonors} icon={Users} helper="Supporters counted by donor name." />
          <SnapshotMetric label="Average donation" value={formatCurrency(avgDonation)} icon={TrendingUp} helper="Average amount per donation transaction." />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionLabel>Secondary activity</SectionLabel>
              <h2 className="mt-2 text-xl font-bold text-white">Recent transactions</h2>
            </div>
            <ActionLink href="/dashboard/donations">View all</ActionLink>
          </div>
          <DonationsTable donations={donations} title="Recent Transactions" maxItems={6} />
        </div>

        <div className="space-y-3">
          <div>
            <SectionLabel>Account details</SectionLabel>
            <h2 className="mt-2 text-xl font-bold text-white">Virtual account</h2>
          </div>
          <VirtualAccountCard account={account} />
        </div>
      </section>
    </div>
  )
}

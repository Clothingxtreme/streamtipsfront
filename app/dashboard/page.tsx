"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  ArrowRight,
  Check,
  Circle,
  Copy,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useDonations } from "@/app/context/DonationsContext"
import { useAuth } from "@/app/context/AuthContext"
import { useOverlaySettings } from "@/app/context/OverlaySettingsContext"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { DonorAvatar } from "@/components/donor-avatar"
import { isDonationPendingReview } from "@/components/dashboard/donations-table"
import { cn } from "@/lib/utils"

const formatCurrency = (num: number) => {
  if (num >= 1_000_000_000) return "NGN " + (num / 1_000_000_000).toFixed(1) + "B"
  if (num >= 1_000_000) return "NGN " + (num / 1_000_000).toFixed(1) + "M"
  if (num >= 1_000) return "NGN " + (num / 1_000).toFixed(1) + "K"
  return "NGN " + num.toLocaleString()
}

const maxTier = 4
const RECENT_DONATION_LIMIT = 5

type SessionDonation = {
  amount?: number | string
  createdAt?: string | Date
  date?: string | Date
  paymentStatus?: string
  walletStatus?: string
  status?: string
}

function getDonationDate(donation: SessionDonation) {
  const value = donation.createdAt || donation.date
  const date = value ? new Date(value) : new Date(0)
  return Number.isNaN(date.getTime()) ? new Date(0) : date
}

function isReviewDonationVisible(donation: SessionDonation) {
  const walletStatus = String(donation.walletStatus || "").toLowerCase()
  const status = String(donation.status || "").toLowerCase()
  const paymentStatus = String(donation.paymentStatus || "").toUpperCase()

  if (walletStatus === "rejected" || status === "failed") return false
  return paymentStatus === "PAID" || status === "completed" || status === "pending" || !paymentStatus
}

function formatDonationTime(value?: string | Date) {
  if (!value) return { relative: "Just now", full: "" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { relative: "Just now", full: "" }
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    full: new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date),
  }
}

const linkFocus =
  "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"

function Card({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 sm:p-6", className)} {...props}>
      {children}
    </section>
  )
}

function CardHeader({ title, action, icon: Icon }: { title: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
        {Icon ? <Icon className="h-4 w-4 text-zinc-500" aria-hidden /> : null}
        {title}
      </h2>
      {action}
    </div>
  )
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-purple-200 transition-colors hover:text-white",
        linkFocus,
      )}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  )
}

function ProgressBar({ value, className, label }: { value: number; className?: string; label: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
    >
      <div className={cn("h-full rounded-full", className)} style={{ width: `${clamped}%` }} />
    </div>
  )
}

export default function DashboardPage() {
  const { donations, status: donationsStatus, reloadDonations } = useDonations()
  const { user } = useAuth()
  const { settings: overlaySettings } = useOverlaySettings()
  const { customization } = useOverlayCustomization()
  const [previousDashboardVisitAt, setPreviousDashboardVisitAt] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return

    const storageKey = `streamtip.dashboard.lastVisit.${user.id}`
    // The dashboard can mount more than once per visit, and each mount stamps the visit time, so remember
    // the previous visit for the rest of this browser session instead of re-reading the value just written.
    const sessionKey = `${storageKey}.previous`
    try {
      let previousVisit = window.sessionStorage.getItem(sessionKey)
      if (previousVisit === null) {
        previousVisit = window.localStorage.getItem(storageKey) || ""
        window.sessionStorage.setItem(sessionKey, previousVisit)
      }
      setPreviousDashboardVisitAt(previousVisit)
      window.localStorage.setItem(storageKey, new Date().toISOString())
    } catch {
      setPreviousDashboardVisitAt("")
    }
  }, [user?.id])

  // --- Earnings (unchanged sources and formulas) ---
  const totalFromDonations = donations.reduce((sum, donation) => sum + Number(donation.amount || 0), 0)
  const walletTotalReceived = Number(user?.wallet?.totalReceived || 0)
  const totalEarnings = Math.max(walletTotalReceived, totalFromDonations)
  const totalDonations = donations.length
  const uniqueDonors = new Set(donations.map((donation) => donation.senderName || donation.sender || "Anonymous")).size

  // --- Stream readiness (unchanged rules, destinations and score) ---
  const accountReady =
    Boolean(user?.virtualAccount?.accountNumber) &&
    String(user?.virtualAccount?.status || "active").toLowerCase() !== "failed"
  const overlayReady = Boolean(user?.id)
  const donationAnimationReady = Boolean(overlaySettings.animations)
  const leaderboardReady = Boolean(customization.showLeaderboard)
  const donationGoalReady = Boolean(customization.goalTitle?.trim()) && Number(customization.goalAmount || 0) > 0
  const profileReady = Boolean(user?.name && user?.email) && Boolean(user?.socialProfile?.handle || user?.socialProfile?.profileUrl || user?.socialProfile?.liveUrl)
  const streamReadyItems = [
    { title: "Virtual Account", complete: accountReady, href: "/dashboard/account", hint: "Get the account supporters pay into" },
    { title: "Overlay Connected", complete: overlayReady, href: "/dashboard/overlay", hint: "Add your overlay link to OBS" },
    { title: "Donation Animation", complete: donationAnimationReady, href: "/dashboard/settings", hint: "Turn on tip animations" },
    { title: "Leaderboard", complete: leaderboardReady, href: "/dashboard/overlay", hint: "Show top supporters on stream" },
    { title: "Donation Goal", complete: donationGoalReady, href: "/dashboard/overlay", hint: "Set a goal title and amount" },
    { title: "Complete Profile", complete: profileReady, href: "/dashboard/settings#social-profiles", hint: "Add your social page" },
  ]
  const completedStreamReadyItems = streamReadyItems.filter((item) => item.complete).length
  const streamReadyScore = Math.round((completedStreamReadyItems / streamReadyItems.length) * 100)

  // --- Tier (unchanged calculation) ---
  const tier = Math.min(maxTier, Math.max(1, Number(user?.kyc?.tier || user?.kycTier || 1)))
  const tierProgress = Math.round((tier / maxTier) * 100)
  const upgradeUnderReview = user?.kyc?.upgradeStatus === "awaiting_review"

  // --- Since last visit (same visit tracking and visibility rule as the previous session review) ---
  const sinceLastVisit = useMemo(() => {
    const previousVisitTime = previousDashboardVisitAt ? new Date(previousDashboardVisitAt).getTime() : 0
    if (!previousVisitTime || Number.isNaN(previousVisitTime)) return null
    const recent = donations
      .filter(isReviewDonationVisible)
      .filter((donation) => getDonationDate(donation).getTime() > previousVisitTime)
    if (!recent.length) return null
    return {
      count: recent.length,
      amount: recent.reduce((sum, donation) => sum + Number(donation.amount || 0), 0),
    }
  }, [donations, previousDashboardVisitAt])

  const virtualAccount = user?.virtualAccount
  const canCopyAccountNumber = accountReady && /^\d+$/.test(String(virtualAccount?.accountNumber || ""))
  const recentDonations = donations.slice(0, RECENT_DONATION_LIMIT)
  const showDonationsLoading = donationsStatus === "loading" || (donationsStatus === "idle" && !donations.length)
  const showDonationsError = donationsStatus === "error" && !donations.length

  const copyAccountNumber = async () => {
    if (!canCopyAccountNumber || !virtualAccount?.accountNumber) return
    try {
      await navigator.clipboard.writeText(virtualAccount.accountNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div data-tour="dashboard-main" className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Your earnings, setup status and latest tips at a glance.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Earnings */}
        <Card className="lg:col-span-2" aria-labelledby="dashboard-earnings-title">
          <CardHeader
            title="Total received"
            icon={Wallet}
            action={<TextLink href="/dashboard/earnings">View earnings</TextLink>}
          />
          <p id="dashboard-earnings-title" className="mt-3 text-4xl font-bold tracking-tight text-white tabular-nums sm:text-5xl">
            {formatCurrency(totalEarnings)}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {totalDonations.toLocaleString()} donation{totalDonations === 1 ? "" : "s"}
            {totalDonations ? ` from ${uniqueDonors.toLocaleString()} supporter${uniqueDonors === 1 ? "" : "s"}` : ""}
          </p>
          {sinceLastVisit ? (
            <p className="mt-3 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              +{formatCurrency(sinceLastVisit.amount)} from {sinceLastVisit.count} donation{sinceLastVisit.count === 1 ? "" : "s"} since your last visit
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            {accountReady && virtualAccount ? (
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Supporters send tips to</p>
                  <p className="truncate text-sm font-medium text-white">
                    {virtualAccount.bankName ? `${virtualAccount.bankName} · ` : ""}
                    <span className="font-mono tracking-wide">{virtualAccount.accountNumber}</span>
                  </p>
                </div>
                {canCopyAccountNumber ? (
                  <button
                    type="button"
                    onClick={() => void copyAccountNumber()}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:text-white",
                      linkFocus,
                    )}
                    aria-label={copied ? "Account number copied" : "Copy account number"}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Your virtual account details will appear here once it is ready.</p>
            )}
            <div className="flex items-center gap-4">
              <TextLink href="/dashboard/account">Account details</TextLink>
              <TextLink href="/dashboard/analytics">Analytics</TextLink>
            </div>
          </div>
        </Card>

        {/* Tier */}
        <Card aria-labelledby="dashboard-tier-title">
          <CardHeader title="Creator tier" icon={ShieldCheck} />
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <p id="dashboard-tier-title" className="text-3xl font-bold text-white">Tier {tier}</p>
            <span className="text-sm tabular-nums text-zinc-400">{tier} of {maxTier}</span>
          </div>
          <div className="mt-4">
            <ProgressBar
              value={tierProgress}
              label="Creator tier progress"
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            />
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            {upgradeUnderReview
              ? "Your upgrade request is under review."
              : tier < maxTier
                ? `Next: Tier ${tier + 1}, with higher account limits.`
                : "You're on the highest tier."}
          </p>
          <div className="mt-4">
            <TextLink href="/dashboard/kyc-upgrade">View tier benefits</TextLink>
          </div>
        </Card>

        {/* Recent donations */}
        <Card className="lg:col-span-2" aria-labelledby="dashboard-recent-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="dashboard-recent-title" className="text-sm font-semibold text-zinc-300">Recent donations</h2>
            <TextLink href="/dashboard/donations">View all</TextLink>
          </div>

          {showDonationsLoading ? (
            <ul className="mt-4 space-y-3" aria-label="Loading recent donations">
              {Array.from({ length: 3 }).map((_, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06] motion-reduce:animate-none" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06] motion-reduce:animate-none" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-white/[0.04] motion-reduce:animate-none" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06] motion-reduce:animate-none" />
                </li>
              ))}
            </ul>
          ) : showDonationsError ? (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
              <span>We couldn&apos;t load your donations.</span>
              <button
                type="button"
                onClick={reloadDonations}
                className={cn("self-start font-medium text-white underline underline-offset-4 sm:self-auto", linkFocus)}
              >
                Try again
              </button>
            </div>
          ) : recentDonations.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
              <p className="text-sm font-medium text-zinc-300">No donations yet</p>
              <p className="mt-1 text-sm text-zinc-500">Tips will appear here as soon as supporters send them.</p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {recentDonations.map((donation, index) => {
                const name = donation.senderName || donation.sender || "Anonymous"
                const amount = Number(donation.amount) || 0
                const pending = isDonationPendingReview(donation as Parameters<typeof isDonationPendingReview>[0])
                const time = formatDonationTime(donation.createdAt)
                return (
                  <li key={donation._id || `${name}-${index}`} className="flex items-center gap-3 py-3">
                    <DonorAvatar name={name} className="h-9 w-9 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      <p className="text-xs text-zinc-500">
                        <time dateTime={donation.createdAt ? new Date(donation.createdAt).toISOString() : undefined} title={time.full}>
                          {time.relative}
                        </time>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-semibold tabular-nums", pending ? "text-amber-300" : "text-emerald-400")}>
                        NGN {amount.toLocaleString()}
                      </p>
                      {pending ? <p className="text-xs text-amber-400">Pending review</p> : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Stream readiness */}
        <Card aria-labelledby="dashboard-readiness-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="dashboard-readiness-title" className="text-sm font-semibold text-zinc-300">Stream readiness</h2>
            <span className="text-sm tabular-nums text-zinc-400">
              <span className="font-semibold text-white">{streamReadyScore}%</span> · {completedStreamReadyItems}/{streamReadyItems.length}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar
              value={streamReadyScore}
              label="Stream readiness"
              className={
                streamReadyScore >= 80 ? "bg-emerald-400" : streamReadyScore >= 50 ? "bg-amber-300" : "bg-red-400"
              }
            />
          </div>
          <ul className="mt-4 space-y-1">
            {streamReadyItems.map((item) =>
              item.complete ? (
                <li key={item.title} className="flex items-center gap-3 px-2 py-2 text-sm text-zinc-400">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="truncate">{item.title}</span>
                  <span className="sr-only">(complete)</span>
                </li>
              ) : (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/[0.04]",
                      linkFocus,
                    )}
                  >
                    <Circle className="h-5 w-5 shrink-0 text-zinc-600" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white">{item.title}</span>
                      <span className="block truncate text-xs text-zinc-500">{item.hint}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-purple-200 group-hover:text-white">
                      Set up
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              ),
            )}
          </ul>
          {completedStreamReadyItems === streamReadyItems.length ? (
            <p className="mt-3 text-sm text-emerald-300">You&apos;re ready to go live.</p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

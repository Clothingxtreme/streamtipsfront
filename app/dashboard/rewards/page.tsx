"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, Copy, Gift, Link2, Target, Trophy, Users } from "lucide-react"
import { authRequest } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RewardHistoryItem = {
  id: string
  source: "referral" | "milestone" | "manual" | string
  title: string
  reductionPercent: number
  awardedAt?: string
  expiresAt?: string
  remainingMs: number
  expired: boolean
}

type MilestoneProgress = {
  id: string
  title: string
  metric: string
  target: number
  current: number
  reductionPercent: number
  expirationDays: number
  completed: boolean
  awarded: boolean
  progressPercent: number
}

type RewardsPayload = {
  currentPlatformFeePercent: number
  defaultPlatformFeePercent: number
  minimumPlatformFeePercent: number
  activeReductionPercent: number
  referralReductionPercent: number
  milestoneReductionPercent: number
  timeRemainingMs: number
  referral: {
    code: string
    link: string
    qualifyingDonationAmount: number
    reductionPercent: number
    reductionCapPercent: number
    total: number
    successful: number
    referredCreators: Array<{
      id: string
      name: string
      email: string
      totalDonations: number
      qualified: boolean
      progressPercent: number
    }>
  }
  progress: {
    totalAmount: number
    totalDonations: number
    donationDays: number
    uniqueSupporters: number
  }
  milestones: MilestoneProgress[]
  upcomingRewards: MilestoneProgress[]
  completedRewards: MilestoneProgress[]
  activeRewards: RewardHistoryItem[]
  rewardHistory: RewardHistoryItem[]
}

function formatCurrency(value: number) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

function formatRemaining(ms: number) {
  if (!ms) return "No active timer"
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${Math.max(1, hours)}h remaining`
}

function metricLabel(metric: string) {
  if (metric === "total_donations") return "donations"
  if (metric === "donation_days") return "days"
  if (metric === "unique_supporters") return "supporters"
  return "raised"
}

function progressValue(item: MilestoneProgress) {
  if (item.metric === "total_amount") {
    return `${formatCurrency(item.current)} / ${formatCurrency(item.target)}`
  }
  return `${Number(item.current || 0).toLocaleString()} / ${Number(item.target || 0).toLocaleString()} ${metricLabel(item.metric)}`
}

export default function CreatorRewardsPage() {
  const [rewards, setRewards] = useState<RewardsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")

  const loadRewards = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await authRequest("/rewards")
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not load creator rewards.")
      }

      setRewards(payload?.rewards || null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load creator rewards.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRewards()
  }, [])

  const nextRewards = useMemo(() => rewards?.upcomingRewards?.slice(0, 4) || [], [rewards])

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(""), 1800)
  }

  if (loading) {
    return <div className="p-8 text-white">Loading creator rewards...</div>
  }

  if (error || !rewards) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
          {error || "Creator rewards could not be loaded."}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5 sm:p-6 lg:p-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Creator rewards</p>
        <h1 className="mt-2 text-3xl font-black text-white">Lower your StreamTips fee</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Referrals and milestones temporarily reduce your platform fee. The fee can never go below {rewards.minimumPlatformFeePercent}%.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr_0.8fr]">
        <div className="rounded-xl bg-gradient-to-br from-purple-500/20 via-zinc-900 to-cyan-500/10 p-5">
          <p className="text-sm text-zinc-400">Current platform fee</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-6xl font-black text-white">{rewards.currentPlatformFeePercent}%</p>
            <span className="pb-2 text-sm font-semibold text-emerald-300">
              -{rewards.activeReductionPercent}% active
            </span>
          </div>
          <p className="mt-4 text-sm text-zinc-400">
            Default fee is {rewards.defaultPlatformFeePercent}%. {formatRemaining(rewards.timeRemainingMs)}.
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900/80 p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-300" />
            <p className="font-semibold text-white">Referral rewards</p>
          </div>
          <p className="mt-4 text-3xl font-black text-white">{rewards.referral.successful}/{rewards.referral.total}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Each successful referral gives {rewards.referral.reductionPercent}% off, capped at {rewards.referral.reductionCapPercent}%.
          </p>
        </div>

        <div className="rounded-xl bg-zinc-900/80 p-5">
          <div className="flex items-center gap-3">
            <Trophy className="h-5 w-5 text-amber-300" />
            <p className="font-semibold text-white">Milestone rewards</p>
          </div>
          <p className="mt-4 text-3xl font-black text-white">{rewards.completedRewards.length}/{rewards.milestones.length}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Completed challenges can stack until the minimum fee is reached.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl bg-zinc-900/80 p-5">
          <div className="flex items-center gap-3">
            <Link2 className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-bold text-white">Referral link</h2>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-lg bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Referral Code</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="truncate text-2xl font-black text-white">{rewards.referral.code}</p>
                <Button type="button" variant="outline" className="border-zinc-700 bg-zinc-950 text-white" onClick={() => void copyValue("code", rewards.referral.code)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied === "code" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Referral Link</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{rewards.referral.link}</p>
              <Button type="button" className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white" onClick={() => void copyValue("link", rewards.referral.link)}>
                <Copy className="mr-2 h-4 w-4" />
                {copied === "link" ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/80 p-5">
          <h2 className="text-xl font-bold text-white">Current progress</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-black/20 p-4">
              <Gift className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm text-zinc-500">Total received</p>
              <p className="text-2xl font-black text-white">{formatCurrency(rewards.progress.totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-4">
              <Target className="h-5 w-5 text-cyan-300" />
              <p className="mt-3 text-sm text-zinc-500">Donations</p>
              <p className="text-2xl font-black text-white">{rewards.progress.totalDonations}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-4">
              <Clock3 className="h-5 w-5 text-purple-300" />
              <p className="mt-3 text-sm text-zinc-500">Donation days</p>
              <p className="text-2xl font-black text-white">{rewards.progress.donationDays}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-4">
              <Users className="h-5 w-5 text-amber-300" />
              <p className="mt-3 text-sm text-zinc-500">Unique supporters</p>
              <p className="text-2xl font-black text-white">{rewards.progress.uniqueSupporters}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl bg-zinc-900/80 p-5">
          <h2 className="text-xl font-bold text-white">Upcoming rewards</h2>
          <div className="mt-5 space-y-3">
            {nextRewards.length ? nextRewards.map((item) => (
              <div key={item.id} className="rounded-lg bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{item.title}</p>
                  <span className="text-sm font-bold text-cyan-200">-{item.reductionPercent}%</span>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{progressValue(item)}</p>
                <div className="mt-3 h-2 rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${item.progressPercent}%` }} />
                </div>
              </div>
            )) : (
              <p className="rounded-lg bg-black/20 p-4 text-sm text-zinc-400">All configured milestones are complete.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/80 p-5">
          <h2 className="text-xl font-bold text-white">Completed rewards</h2>
          <div className="mt-5 space-y-3">
            {rewards.completedRewards.length ? rewards.completedRewards.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  <p className="font-semibold text-white">{item.title}</p>
                </div>
                <span className="text-sm font-bold text-emerald-200">-{item.reductionPercent}%</span>
              </div>
            )) : (
              <p className="rounded-lg bg-black/20 p-4 text-sm text-zinc-400">No completed rewards yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-zinc-900/80 p-5">
        <h2 className="text-xl font-bold text-white">Reward history</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-3">Reward</th>
                <th>Source</th>
                <th>Reduction</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rewards.rewardHistory.map((reward) => (
                <tr key={reward.id}>
                  <td className="py-4 font-semibold text-white">{reward.title}</td>
                  <td className="capitalize text-zinc-400">{reward.source}</td>
                  <td className="font-bold text-cyan-200">-{reward.reductionPercent}%</td>
                  <td>
                    <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", reward.expired ? "bg-zinc-800 text-zinc-400" : "bg-emerald-500/10 text-emerald-300")}>
                      {reward.expired ? "Expired" : "Active"}
                    </span>
                  </td>
                  <td className="text-zinc-400">{formatRemaining(reward.remainingMs)}</td>
                </tr>
              ))}
              {!rewards.rewardHistory.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500">No rewards earned yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

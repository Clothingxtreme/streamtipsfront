"use client"

import { useEffect, useMemo, useState } from "react"
import { io } from "socket.io-client"
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react"
import { EarningsSummaryCard } from "@/components/dashboard/earnings-summary-card"
import { EarningsChart } from "@/components/dashboard/earnings-chart"
import { PayoutsTable, type Payout } from "@/components/dashboard/payouts-table"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { readStoredAppPreferences } from "@/lib/app-preferences"
import { authRequest, getStoredSessionToken } from "@/lib/auth-client"
import { emitNotificationFeedback } from "@/lib/notification-runtime"
import { getSocketUrl } from "@/lib/runtime-config"

type Donation = {
  sender?: string
  senderName?: string
  amount: number
  creatorShare?: number
  walletStatus?: "available" | "pending_review" | "rejected"
  fundsFlow?: "wallet" | "direct_split"
  provider?: string
  date?: string
  createdAt?: string
}

type WithdrawResult =
  | {
      status: "success"
      title: string
      description: string
    }
  | {
      status: "error"
      title: string
      description: string
    }
  | null

const MIN_WITHDRAWAL = 5000
const PLATFORM_FEE_RATE = 0.2
const CREATOR_SHARE_RATE = 0.8

function normalizePayoutStatus(status: unknown): Payout["status"] {
  if (
    status === "completed" ||
    status === "success" ||
    status === "failed" ||
    status === "pending" ||
    status === "processing" ||
    status === "pending_admin_approval" ||
    status === "approved" ||
    status === "otp_required" ||
    status === "otp_resent" ||
    status === "awaiting_review" ||
    status === "rejected" ||
    status === "cancelled"
  ) {
    return status
  }

  return "pending"
}

function mergePayouts(existing: Payout[], incoming: Payout) {
  const incomingId = incoming._id || ""
  const incomingFingerprint = `${incoming.amount}-${incoming.bankName}-${incoming.accountNumber}-${new Date(
    incoming.createdAt,
  ).getTime()}`

  const withoutDuplicate = existing.filter((item) => {
    const itemFingerprint = `${item.amount}-${item.bankName}-${item.accountNumber}-${new Date(
      item.createdAt,
    ).getTime()}`

    return item._id !== incomingId && itemFingerprint !== incomingFingerprint
  })

  return [incoming, ...withoutDuplicate]
}

function formatCurrency(amount: number) {
  return `NGN ${amount.toLocaleString()}`
}

function normalizeDate(value?: string) {
  return new Date(value || Date.now())
}

export default function EarningsPage() {
  const { user, isAuthenticated } = useAuth()
  const showManualWithdrawal = false
  const [donations, setDonations] = useState<Donation[]>([])
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResult>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setDonations([])
      setTotalEarnings(0)
      return
    }

    void authRequest("/donations")
      .then((res) => res.json())
      .then((data) => {
        const nextDonations = Array.isArray(data) ? data : []
        setDonations(nextDonations)

        const total = nextDonations.reduce((sum: number, donation: Donation) => {
          return sum + (Number(donation.amount) || 0)
        }, 0)

        setTotalEarnings(total)
      })
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setPayouts([])
      return
    }

    void authRequest("/payouts")
      .then((res) => res.json())
      .then((data) => {
        const formatted = (Array.isArray(data) ? data : []).map((payout: any) => ({
          ...payout,
          _id: payout._id || payout.id,
          status: normalizePayoutStatus(payout.status),
          createdAt: new Date(payout.createdAt),
          completedAt: payout.completedAt ? new Date(payout.completedAt) : undefined,
        }))

        setPayouts(formatted)
      })
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return
    }

    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
      auth: {
        sessionToken: getStoredSessionToken(),
      },
    })

    socket.on("newDonation", (data) => {
      if (data.creatorId && data.creatorId !== user.id) {
        return
      }

      const amount = Number(data.amount) || 0

      setDonations((prev) => [data, ...prev])
      setTotalEarnings((prev) => prev + amount)
    })

    socket.on("newPayout", (data) => {
      if (data.creatorId && data.creatorId !== user.id) {
        return
      }

      const payout = {
        ...data,
        _id: data._id || data.id,
        status: normalizePayoutStatus(data.status),
        createdAt: new Date(data.createdAt || Date.now()),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      }

      setPayouts((prev) => {
        return mergePayouts(prev, payout)
      })

      const preferences = readStoredAppPreferences()
      if (preferences.payoutNotifications) {
        void emitNotificationFeedback("payout", preferences, {
          title: "Payout update",
          body: `${formatCurrency(Number(data.amount) || 0)} payout marked ${payout.status}.`,
          tag: `payout-${payout._id}`,
        })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated, user])

  const weeklyData = useMemo(() => {
    const grouped = donations.reduce((acc: { label: string; amount: number }[], donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      const day = date.toLocaleDateString("en-US", { weekday: "short" })
      const existing = acc.find((item) => item.label === day)

      if (existing) {
        existing.amount += Number(donation.amount) || 0
      } else {
        acc.push({ label: day, amount: Number(donation.amount) || 0 })
      }

      return acc
    }, [])

    const order = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    grouped.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
    return grouped
  }, [donations])

  const monthlyData = useMemo(() => {
    return donations.reduce((acc: { label: string; amount: number }[], donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      const month = date.toLocaleDateString("en-US", { month: "short" })
      const existing = acc.find((item) => item.label === month)

      if (existing) {
        existing.amount += Number(donation.amount) || 0
      } else {
        acc.push({ label: month, amount: Number(donation.amount) || 0 })
      }

      return acc
    }, [])
  }, [donations])

  const todayEarnings = useMemo(() => {
    const now = new Date()

    return donations.reduce((sum, donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()

      return isToday ? sum + (Number(donation.amount) || 0) : sum
    }, 0)
  }, [donations])

  const cleanWithdrawAmount = withdrawAmount.replace(/,/g, "")
  const parsedWithdrawAmount = Number(cleanWithdrawAmount) || 0
  const monnifySplitWindowStart = useMemo(() => {
    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setHours(14, 0, 0, 0)
    return windowStart
  }, [])
  const monnifySplitWindowLabel = useMemo(
    () =>
      monnifySplitWindowStart.toLocaleTimeString("en-NG", {
        hour: "numeric",
        minute: "2-digit",
      }),
    [monnifySplitWindowStart],
  )
  const platformFeeReserved = Math.round(totalEarnings * PLATFORM_FEE_RATE)
  const monnifySplitCreatorBalanceToday = donations.reduce((sum, donation) => {
    if (String(donation.provider || "monnify").toLowerCase() !== "monnify") return sum
    if ((donation.fundsFlow || "wallet") !== "direct_split") return sum
    if ((donation.walletStatus || "available") === "rejected") return sum
    const donationDate = normalizeDate(donation.date || donation.createdAt)
    if (Number.isNaN(donationDate.getTime())) return sum
    if (donationDate < monnifySplitWindowStart) return sum
    return (
      sum +
      (Number(donation.creatorShare) ||
        Math.round((Number(donation.amount) || 0) * CREATOR_SHARE_RATE))
    )
  }, 0)
  const pendingReviewFromDonations = donations.reduce((sum, donation) => {
    if ((donation.fundsFlow || "wallet") === "direct_split") return sum
    if (donation.walletStatus !== "pending_review") return sum
    return sum + (Number(donation.creatorShare) || Math.round((Number(donation.amount) || 0) * CREATOR_SHARE_RATE))
  }, 0)
  const pendingReviewBalance =
    Math.max(Number(user?.wallet?.pendingBalance || 0), pendingReviewFromDonations)
  const availableBalance = Math.max(0, monnifySplitCreatorBalanceToday)
  const payoutProfile = user?.payoutProfile
  const hasLockedPayoutProfile = Boolean(
    payoutProfile?.locked &&
      payoutProfile.status === "verified" &&
      payoutProfile.accountNumber &&
      payoutProfile.accountName,
  )

  const validationMessage = useMemo(() => {
    if (!withdrawAmount) return "Enter the amount you want to withdraw."
    if (!parsedWithdrawAmount || parsedWithdrawAmount <= 0) return "Enter a valid withdrawal amount."
    if (parsedWithdrawAmount < MIN_WITHDRAWAL) {
      return `Minimum withdrawal is ${formatCurrency(MIN_WITHDRAWAL)}.`
    }
    if (!hasLockedPayoutProfile) {
      return "Add and lock your payout bank account in settings before withdrawing."
    }
    if (parsedWithdrawAmount > availableBalance) return "This amount is above your available balance."
    return ""
  }, [
    availableBalance,
    hasLockedPayoutProfile,
    parsedWithdrawAmount,
    withdrawAmount,
  ])

  const canSubmitWithdrawal = validationMessage === ""

  const resetWithdrawForm = () => {
    setWithdrawAmount("")
    setLoading(false)
  }

  const closeWithdrawModal = () => {
    setShowWithdraw(false)
    resetWithdrawForm()
  }

  const handleWithdraw = async () => {
    if (!canSubmitWithdrawal) return

    setLoading(true)
    setWithdrawResult(null)

    try {
      const response = await authRequest("/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedWithdrawAmount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data?.payout) {
          setPayouts((prev) =>
            mergePayouts(prev, {
              _id: data.payout._id || data.payout.id || crypto.randomUUID(),
              amount: Number(data.payout.amount) || parsedWithdrawAmount,
              status: normalizePayoutStatus(data.payout.status),
              bankName: data.payout.bankName || payoutProfile?.bankName || "",
              accountNumber: data.payout.accountNumber || payoutProfile?.accountNumber || "",
              accountName: data.payout.accountName || payoutProfile?.accountName || "",
              transferReference: data.payout.transferReference,
              providerReference: data.payout.providerReference,
              providerMessage: data.payout.providerMessage,
              createdAt: new Date(data.payout.createdAt || Date.now()),
              completedAt: data.payout.completedAt ? new Date(data.payout.completedAt) : undefined,
            }),
          )
        }

        throw new Error(data?.error || data?.message || "Something went wrong while creating the payout.")
      }

      setPayouts((prev) =>
        mergePayouts(prev, {
          _id: data._id || data.id || crypto.randomUUID(),
          amount: parsedWithdrawAmount,
          status: normalizePayoutStatus(data.status),
          bankName: data.bankName || payoutProfile?.bankName || "",
          accountNumber: data.accountNumber || payoutProfile?.accountNumber || "",
          accountName: data.accountName || payoutProfile?.accountName || "",
          transferReference: data.transferReference,
          providerReference: data.providerReference,
          providerMessage: data.providerMessage,
          createdAt: new Date(data.createdAt || Date.now()),
          completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        }),
      )

      setWithdrawResult({
        status: "success",
        title:
          data.status === "awaiting_review" || data.status === "pending_admin_approval"
            ? "Withdrawal sent for review"
            : "Withdrawal request submitted",
        description:
          data.status === "awaiting_review" || data.status === "pending_admin_approval"
            ? `${formatCurrency(parsedWithdrawAmount)} is waiting for StreamTip settlement review. Nothing has been sent for transfer yet.`
            : `${formatCurrency(parsedWithdrawAmount)} was submitted for ${payoutProfile?.bankName || "your bank"} - ${(payoutProfile?.accountNumber || "").slice(-4)}. Check the payout status before treating it as settled.`,
      })

      const preferences = readStoredAppPreferences()
      if (preferences.payoutNotifications) {
        void emitNotificationFeedback("payout", preferences, {
          title: "Withdrawal submitted",
          body: `${formatCurrency(parsedWithdrawAmount)} withdrawal requested for ${(payoutProfile?.accountNumber || "").slice(-4)}.`,
          tag: `withdrawal-${data._id || data.id || "local"}`,
        })
      }
      resetWithdrawForm()
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : "We could not process your withdrawal right now. Please try again."

      setWithdrawResult({
        status: "error",
        title: "Withdrawal could not be completed",
        description,
      })
      setLoading(false)
    }
  }

  const yesterdayEarnings = useMemo(() => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    return donations.reduce((sum, donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
      return isYesterday ? sum + (Number(donation.amount) || 0) : sum
    }, 0)
  }, [donations])

  const weeklyEarnings = weeklyData.reduce((sum, item) => sum + item.amount, 0)
  const previousWeekEarnings = useMemo(() => {
    const now = new Date()
    const startOfThisWeek = new Date(now)
    startOfThisWeek.setDate(now.getDate() - now.getDay())
    startOfThisWeek.setHours(0, 0, 0, 0)
    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)
    return donations.reduce((sum, donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      return date >= startOfLastWeek && date < startOfThisWeek ? sum + (Number(donation.amount) || 0) : sum
    }, 0)
  }, [donations])

  const monthlyEarnings = monthlyData.reduce((sum, item) => sum + item.amount, 0)
  const previousMonthEarnings = useMemo(() => {
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return donations.reduce((sum, donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      return date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear
        ? sum + (Number(donation.amount) || 0)
        : sum
    }, 0)
  }, [donations])

  const thisYearEarnings = useMemo(() => {
    const year = new Date().getFullYear()
    return donations.reduce((sum, donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      return date.getFullYear() === year ? sum + (Number(donation.amount) || 0) : sum
    }, 0)
  }, [donations])

  const lastYearEarnings = useMemo(() => {
    const lastYear = new Date().getFullYear() - 1
    return donations.reduce((sum, donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      return date.getFullYear() === lastYear ? sum + (Number(donation.amount) || 0) : sum
    }, 0)
  }, [donations])

  const totalWithdrawn = useMemo(
    () =>
      payouts.reduce((sum, payout) => {
        if (payout.status === "completed" || payout.status === "success") {
          return sum + (Number(payout.amount) || 0)
        }
        return sum
      }, 0),
    [payouts],
  )

  const totalGrossEarnings = (user?.wallet?.totalReceived || 0) > 0
    ? user!.wallet!.totalReceived
    : donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

  const creatorTotalProfit = Math.round(totalGrossEarnings * CREATOR_SHARE_RATE)

  const netEarnings = Math.max(0, monnifySplitCreatorBalanceToday)

  return (
    <div data-tour="earnings-main" className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-zinc-500">Track your income and manage payouts.</p>
        </div>

        {showManualWithdrawal ? (
          <Button
            onClick={() => {
              setWithdrawResult(null)
              setShowWithdraw(true)
            }}
            className="h-11 px-5 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Withdraw Funds
          </Button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5">
        <p className="text-sm text-zinc-300">
          Creator Earnings and Available Balance now track today&apos;s Monnify direct-split inflows
          from <span className="font-semibold text-white">{monnifySplitWindowLabel}</span> until now.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <EarningsSummaryCard
          title="Creator Earnings"
          amount={netEarnings}
          icon={Wallet}
          accentColor="purple"
          glowing
        />
        <EarningsSummaryCard
          title="Creator Total Profit"
          amount={creatorTotalProfit}
          icon={BarChart3}
          accentColor="green"
        />
        <EarningsSummaryCard
          title="Total Withdrawn"
          amount={totalWithdrawn}
          icon={ArrowUpFromLine}
          accentColor="amber"
        />
        <EarningsSummaryCard
          title="Today"
          amount={todayEarnings}
          previousAmount={yesterdayEarnings}
          icon={Calendar}
          accentColor="cyan"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <EarningsSummaryCard
          title="This Week"
          amount={weeklyEarnings}
          previousAmount={previousWeekEarnings}
          icon={CalendarDays}
          accentColor="cyan"
        />
        <EarningsSummaryCard
          title="This Month"
          amount={monthlyEarnings}
          previousAmount={previousMonthEarnings}
          icon={TrendingUp}
          accentColor="amber"
        />
        <EarningsSummaryCard
          title="This Year"
          amount={thisYearEarnings}
          previousAmount={lastYearEarnings}
          icon={CalendarRange}
          accentColor="purple"
        />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,0.25),transparent_35%),linear-gradient(135deg,rgba(91,33,182,0.22),rgba(24,24,27,0.95))] p-6">
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.25em] text-purple-200/70">
              Available Balance
            </p>
            <p className="text-4xl font-black text-white">
              {formatCurrency(Number(availableBalance) || 0)}
            </p>
            <p className="text-sm text-zinc-300">
              This shows today&apos;s Monnify split creator share pending provider settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[480px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Minimum</p>
              <p className="mt-1 text-base font-semibold text-white">
                {formatCurrency(MIN_WITHDRAWAL)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Settlement</p>
              <p className="mt-1 text-base font-semibold text-white">Monnify auto-split</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Pending Review</p>
              <p className="mt-1 text-base font-semibold text-amber-300">
                {formatCurrency(pendingReviewBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {weeklyData.length > 0 && <EarningsChart data={weeklyData} title="Weekly Earnings" />}
        <EarningsChart data={monthlyData} title="Monthly Breakdown" />
      </div>

      <PayoutsTable payouts={payouts} />

      <Dialog
        open={showManualWithdrawal && showWithdraw}
        onOpenChange={(open) => {
          if (!open && !loading) {
            closeWithdrawModal()
            setWithdrawResult(null)
          } else if (showManualWithdrawal) {
            setShowWithdraw(open)
          }
        }}
      >
        <DialogContent
          showCloseButton={!loading}
          className="!w-[min(1120px,calc(100vw-1.5rem))] !max-w-[1120px] border-zinc-800 bg-zinc-950 p-0 text-white overflow-hidden"
        >
          {withdrawResult ? (
            <div className="relative">
              <div
                className={`absolute inset-0 ${
                  withdrawResult.status === "success"
                    ? "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_40%)]"
                    : "bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_40%)]"
                }`}
              />
              <div className="relative p-8 sm:p-10 lg:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  {withdrawResult.status === "success" ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-400" />
                  )}
                </div>

                <div className="mt-6 text-center space-y-3">
                  <h2 className="text-2xl font-bold">{withdrawResult.title}</h2>
                  <p className="text-sm leading-6 text-zinc-400">{withdrawResult.description}</p>
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  {withdrawResult.status === "success"
                    ? "You can close this window and keep streaming. We also added the request to your payout history."
                    : "Your balance is untouched. Review the details and try again when you're ready."}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-center">
                  {withdrawResult.status === "error" && (
                    <Button
                      onClick={() => setWithdrawResult(null)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                    >
                      Try Again
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWithdrawResult(null)
                      closeWithdrawModal()
                    }}
                    className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_40%)] p-8 lg:p-10">
                <DialogHeader className="text-left">
                  <DialogTitle className="text-2xl text-white">Withdraw Funds</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Send part of your available balance to your bank account with a quick review before submission.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="p-8 lg:p-10 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-300">Withdrawal amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                        NGN
                      </span>
                      <Input
                        type="text"
                        placeholder="0"
                        value={withdrawAmount}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/,/g, "")
                          if (raw && Number.isNaN(Number(raw))) return
                          setWithdrawAmount(raw ? Number(raw).toLocaleString() : "")
                        }}
                        className="h-12 border-zinc-800 bg-zinc-900 pl-16 text-white placeholder:text-zinc-600 focus-visible:border-purple-500 focus-visible:ring-purple-500/20"
                      />
                    </div>
                    <p className="text-xs text-zinc-500">
                      Minimum withdrawal is {formatCurrency(MIN_WITHDRAWAL)}.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
                    <div className="flex items-start gap-3">
                      <Landmark className="mt-0.5 h-5 w-5 text-purple-300" />
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-white">Locked payout account</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            Withdrawals can only go to the verified bank account on your profile.
                            Contact support for legal account changes.
                          </p>
                        </div>
                        {hasLockedPayoutProfile ? (
                          <div className="grid gap-2 text-sm text-zinc-300">
                            <p>{payoutProfile?.bankName}</p>
                            <p>{payoutProfile?.accountName}</p>
                            <p className="font-mono">**** {(payoutProfile?.accountNumber || "").slice(-4)}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-amber-200">
                            No locked payout account yet. Add one in Settings before withdrawing.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">Before you submit</p>
                        <p className="text-sm text-zinc-400">
                          First withdrawals and limit exceptions go to StreamTip settlement review before any transfer is sent.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/40 p-8 lg:p-10">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Review
                  </h3>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-5">
                      <p className="text-xs uppercase tracking-wide text-zinc-400">You will receive</p>
                      <p className="mt-2 text-3xl font-black text-white">
                        {formatCurrency(parsedWithdrawAmount)}
                      </p>
                      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                        <ArrowRight className="h-3.5 w-3.5" />
                        Transfer fee is free
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Available now</span>
                        <span className="font-medium text-white">
                          {formatCurrency(Number(availableBalance) || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Creator share (80%)</span>
                        <span className="font-medium text-emerald-300">
                          {formatCurrency(monnifySplitCreatorBalanceToday)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Platform reserve (20%)</span>
                        <span className="font-medium text-cyan-300">
                          {formatCurrency(platformFeeReserved)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Pending review</span>
                        <span className="font-medium text-amber-300">
                          {formatCurrency(pendingReviewBalance)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Destination</span>
                        <span className="font-medium text-white text-right">
                          {payoutProfile?.bankName || "Locked payout bank"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Account name</span>
                        <span className="font-medium text-white text-right">
                          {payoutProfile?.accountName || "No payout profile"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Account</span>
                        <span className="font-mono text-white">
                          {payoutProfile?.accountNumber
                            ? `**** ${payoutProfile.accountNumber.slice(-4)}`
                            : "****"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Settlement time</span>
                        <span className="font-medium text-emerald-400">Instant - 24hrs</span>
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 text-sm ${
                        canSubmitWithdrawal
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      {canSubmitWithdrawal
                        ? "Everything looks good. You can submit the withdrawal now."
                        : validationMessage}
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <Button
                        onClick={handleWithdraw}
                        disabled={!canSubmitWithdrawal || loading}
                        className="h-11 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {loading ? "Processing withdrawal..." : "Confirm Withdrawal"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={closeWithdrawModal}
                        disabled={loading}
                        className="h-11 border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}



"use client"

import { useEffect, useMemo, useState } from "react"
import { io } from "socket.io-client"
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { EarningsChart } from "@/components/dashboard/earnings-chart"
import type { Payout } from "@/components/dashboard/payouts-table"
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
import { MetricRow, Notice, PageHeader, PageShell, Panel, primaryButton } from "@/components/dashboard/page-kit"

type Donation = {
  sender?: string
  senderName?: string
  amount: number
  creatorShare?: number
  creatorSettlementVat?: number
  creatorSettlementNetAmount?: number
  creatorSettledAmount?: number
  settlementPendingAmount?: number
  settlementStatus?: "pending" | "partial" | "settled" | "failed" | "unknown"
  status?: "pending" | "completed" | "failed"
  walletStatus?: "available" | "pending_review" | "rejected"
  fundsFlow?: "wallet" | "direct_split"
  provider?: string
  transactionReference?: string
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

/** Same output as the previous summary cards: "₦" + locale-formatted amount. */
function formatNaira(amount: number) {
  return `₦${(Number(amount) || 0).toLocaleString()}`
}

const MIN_WITHDRAWAL = 5000
const CREATOR_SHARE_RATE = 0.8
const MONNIFY_CREATOR_SETTLEMENT_VAT_RATE = 0.0161
const MONNIFY_SPLIT_CUTOVER_AT = new Date("2026-05-20T14:00:00+01:00")
const MONNIFY_SETTLEMENT_CUTOFF_HOUR = 21
const MONNIFY_SETTLEMENT_CUTOFF_MINUTE = 50
const MONNIFY_SETTLEMENT_CLEAR_HOUR = 22
const MONNIFY_SETTLEMENT_CLEAR_MINUTE = 0

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

function getDonationKey(donation: Partial<Donation> & { _id?: string; id?: string; transactionReference?: string }) {
  return String(donation._id || donation.id || donation.transactionReference || "")
}

function mergeDonations(existing: Donation[], incoming: Donation & { _id?: string; id?: string; transactionReference?: string }) {
  const incomingKey = getDonationKey(incoming)
  if (!incomingKey) {
    return [incoming, ...existing]
  }

  const next = existing.slice()
  const index = next.findIndex((item: any) => getDonationKey(item) === incomingKey)
  if (index === -1) {
    next.unshift(incoming)
    return next
  }

  next[index] = {
    ...next[index],
    ...incoming,
  }
  return next
}

function formatCurrency(amount: number) {
  return `NGN ${amount.toLocaleString()}`
}

function normalizeDate(value?: string) {
  return new Date(value || Date.now())
}

function startOfDay(value = new Date()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfWeek(value = new Date()) {
  const date = startOfDay(value)
  date.setDate(date.getDate() - date.getDay())
  return date
}

function startOfMonth(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function getSettlementDateAt(base: Date, hour: number, minute: number) {
  const date = new Date(base)
  date.setHours(hour, minute, 0, 0)
  return date
}

function getActivePendingSettlementWindow(now = new Date()) {
  const todayCutoff = getSettlementDateAt(
    now,
    MONNIFY_SETTLEMENT_CUTOFF_HOUR,
    MONNIFY_SETTLEMENT_CUTOFF_MINUTE,
  )
  const todayClear = getSettlementDateAt(
    now,
    MONNIFY_SETTLEMENT_CLEAR_HOUR,
    MONNIFY_SETTLEMENT_CLEAR_MINUTE,
  )

  if (now >= todayClear) {
    const nextClear = new Date(todayClear)
    nextClear.setDate(todayClear.getDate() + 1)
    return { start: todayCutoff, end: nextClear }
  }

  const previousCutoff = new Date(todayCutoff)
  previousCutoff.setDate(todayCutoff.getDate() - 1)
  return { start: previousCutoff, end: todayClear }
}

function isInsideDateWindow(date: Date, window: { start: Date; end: Date }) {
  return date >= window.start && date < window.end
}

export default function EarningsPage() {
  const { user, isAuthenticated } = useAuth()
  const showManualWithdrawal = false
  const [donations, setDonations] = useState<Donation[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResult>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setDonations([])
      return
    }

    let active = true
    const fetchDonations = async () => {
      try {
        const res = await authRequest("/donations")
        const data = await res.json()
        if (!active) return
        setDonations(Array.isArray(data) ? data : [])
      } catch {
        if (!active) return
      }
    }

    void fetchDonations()
    const interval = setInterval(() => {
      void fetchDonations()
    }, 30000)

    return () => {
      active = false
      clearInterval(interval)
    }
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
      if (data?.manual) {
        return
      }

      if (data.creatorId && data.creatorId !== user.id) {
        return
      }

      setDonations((prev) => mergeDonations(prev, data))
    })

    socket.on("donationSettlementUpdated", (data) => {
      if (data.creatorId && data.creatorId !== user.id) {
        return
      }

      setDonations((prev) => mergeDonations(prev, data))
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

  const getCreatorShareAmount = (donation: Donation) =>
    Number(donation.creatorShare) || Math.round((Number(donation.amount) || 0) * CREATOR_SHARE_RATE)

  const getMonnifyCreatorSettlement = (donation: Donation) => {
    const creatorShare = getCreatorShareAmount(donation)
    const creatorSettlementVat =
      typeof donation.creatorSettlementVat === "number"
        ? donation.creatorSettlementVat
        : Math.round(creatorShare * MONNIFY_CREATOR_SETTLEMENT_VAT_RATE)
    const creatorSettlementNetAmount =
      typeof donation.creatorSettlementNetAmount === "number" && donation.creatorSettlementNetAmount > 0
        ? donation.creatorSettlementNetAmount
        : Math.max(0, creatorShare - creatorSettlementVat)

    return {
      creatorShare,
      creatorSettlementVat,
      creatorSettlementNetAmount,
    }
  }

  const getNetDonationEarnings = (donation: Donation) => {
    const settlement = getMonnifyCreatorSettlement(donation)
    return settlement.creatorSettlementNetAmount
  }

  const isCountableDonation = (donation: Donation) => {
    const settlementStatus = String(donation.settlementStatus || "").toLowerCase()
    const status = String(donation.status || "").toLowerCase()
    const walletStatus = String(donation.walletStatus || "available").toLowerCase()

    return walletStatus !== "rejected" && status !== "failed" && settlementStatus !== "failed"
  }

  const sumNetDonationsBetween = (start: Date, end: Date) =>
    donations.reduce((sum, donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      if (!isCountableDonation(donation) || date < start || date >= end) {
        return sum
      }

      return sum + getNetDonationEarnings(donation)
    }, 0)

  const getSettledAndPending = (donation: Donation) => {
    const { creatorShare, creatorSettlementNetAmount } = getMonnifyCreatorSettlement(donation)
    const provider = String(donation.provider || "monnify").toLowerCase()
    const fundsFlow = String(donation.fundsFlow || "wallet").toLowerCase()
    const isMonnifySettlementTracked =
      provider === "monnify" && (fundsFlow === "wallet" || fundsFlow === "direct_split")
    const settlementStatus = String(donation.settlementStatus || "").toLowerCase()
    const status = String(donation.status || "").toLowerCase()
    const walletStatus = String(donation.walletStatus || "available").toLowerCase()
    const donationDate = normalizeDate(donation.date || donation.createdAt)
    const isRejected = walletStatus === "rejected" || status === "failed" || settlementStatus === "failed"

    if (isRejected) {
      return { settled: 0, pending: 0, creatorShare }
    }

    if (isMonnifySettlementTracked) {
      if (fundsFlow === "wallet" && donationDate < MONNIFY_SPLIT_CUTOVER_AT) {
        return { settled: creatorShare, pending: 0, creatorShare }
      }

      const settled = Math.max(
        0,
        Number(
          donation.creatorSettledAmount ??
            (settlementStatus === "settled" || status === "completed" ? creatorSettlementNetAmount : 0),
        ) || 0,
      )
      const pending = Math.max(
        0,
        Number(
          donation.settlementPendingAmount ??
            (settlementStatus === "pending" || settlementStatus === "partial" || status === "pending"
              ? Math.max(0, creatorSettlementNetAmount - settled)
              : 0),
        ) || 0,
      )
      return { settled, pending, creatorShare }
    }

    return {
      settled: status === "pending" || walletStatus === "pending_review" ? 0 : creatorShare,
      pending: status === "pending" || walletStatus === "pending_review" ? creatorShare : 0,
      creatorShare,
    }
  }

  const weeklyData = useMemo(() => {
    const grouped = donations.reduce((acc: { label: string; amount: number }[], donation) => {
      const date = normalizeDate(donation.date || donation.createdAt)
      const day = date.toLocaleDateString("en-US", { weekday: "short" })
      const existing = acc.find((item) => item.label === day)
      const settledAmount = getSettledAndPending(donation).settled

      if (existing) {
        existing.amount += settledAmount
      } else {
        acc.push({ label: day, amount: settledAmount })
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
      const settledAmount = getSettledAndPending(donation).settled

      if (existing) {
        existing.amount += settledAmount
      } else {
        acc.push({ label: month, amount: settledAmount })
      }

      return acc
    }, [])
  }, [donations])

  const cleanWithdrawAmount = withdrawAmount.replace(/,/g, "")
  const parsedWithdrawAmount = Number(cleanWithdrawAmount) || 0
  const settlementTotals = useMemo(() => {
    return donations.reduce(
      (acc, donation) => {
        const { settled, pending } = getSettledAndPending(donation)
        acc.settled += settled
        acc.pending += pending
        return acc
      },
      { settled: 0, pending: 0 },
    )
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
  const availableBalance = Math.max(
    0,
    Number(settlementTotals.settled - totalWithdrawn),
  )
  const pendingReviewBalance = useMemo(() => {
    const activeWindow = getActivePendingSettlementWindow()
    const pendingSettlement = donations.reduce((sum, donation) => {
      const donationDate = normalizeDate(donation.date || donation.createdAt)
      const provider = String(donation.provider || "monnify").toLowerCase()
      const fundsFlow = String(donation.fundsFlow || "wallet").toLowerCase()
      const settlementStatus = String(donation.settlementStatus || "").toLowerCase()
      const status = String(donation.status || "").toLowerCase()
      const walletStatus = String(donation.walletStatus || "available").toLowerCase()
      const isMonnifySettlementTracked =
        provider === "monnify" && (fundsFlow === "wallet" || fundsFlow === "direct_split")
      const isRejected = walletStatus === "rejected" || status === "failed" || settlementStatus === "failed"

      if (
        !isMonnifySettlementTracked ||
        isRejected ||
        (fundsFlow === "wallet" && donationDate < MONNIFY_SPLIT_CUTOVER_AT) ||
        !isInsideDateWindow(donationDate, activeWindow)
      ) {
        return sum
      }

      return sum + getMonnifyCreatorSettlement(donation).creatorSettlementNetAmount
    }, 0)

    return Math.max(0, Number(pendingSettlement))
  }, [donations])
  const confirmedSettledEarnings = Math.max(0, availableBalance + totalWithdrawn)
  const donationsReceived = Math.max(0, settlementTotals.settled + settlementTotals.pending)
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

  const dailyEarnings = useMemo(() => {
    const today = startOfDay()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return sumNetDonationsBetween(today, tomorrow)
  }, [donations])
  const previousDayEarnings = useMemo(() => {
    const today = startOfDay()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    return sumNetDonationsBetween(yesterday, today)
  }, [donations])

  const weeklyEarnings = useMemo(() => {
    const weekStart = startOfWeek()
    const nextWeek = new Date(weekStart)
    nextWeek.setDate(weekStart.getDate() + 7)
    return sumNetDonationsBetween(weekStart, nextWeek)
  }, [donations])
  const previousWeekEarnings = useMemo(() => {
    const now = new Date()
    const startOfThisWeek = startOfWeek(now)
    const startOfLastWeek = new Date(startOfThisWeek)
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)
    return sumNetDonationsBetween(startOfLastWeek, startOfThisWeek)
  }, [donations])

  const monthlyEarnings = useMemo(() => {
    const monthStart = startOfMonth()
    const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    return sumNetDonationsBetween(monthStart, nextMonth)
  }, [donations])
  const previousMonthEarnings = useMemo(() => {
    const now = new Date()
    const startOfThisMonth = startOfMonth(now)
    const startOfPreviousMonth = new Date(startOfThisMonth.getFullYear(), startOfThisMonth.getMonth() - 1, 1)
    return sumNetDonationsBetween(startOfPreviousMonth, startOfThisMonth)
  }, [donations])

  return (
    <PageShell data-tour="earnings-main">
      <PageHeader
        title="Earnings"
        description="What you've received and where it is in settlement."
        actions={
          showManualWithdrawal ? (
            <button
              type="button"
              onClick={() => {
                setWithdrawResult(null)
                setShowWithdraw(true)
              }}
              className={primaryButton}
            >
              <ArrowDownToLine className="h-4 w-4" aria-hidden />
              Withdraw Funds
            </button>
          ) : null
        }
      />

      <Panel>
        <MetricRow
          metrics={[
            {
              label: "Donations received",
              value: formatNaira(donationsReceived),
              hint: "Your share, settled plus pending",
            },
            {
              label: "Pending settlement",
              value: formatNaira(pendingReviewBalance),
              hint: "Clears at the next 10:00pm window",
              tone: pendingReviewBalance > 0 ? "warning" : "muted",
            },
            {
              label: "Settled",
              value: formatNaira(confirmedSettledEarnings),
              hint: "Sent to your bank account",
              tone: "positive",
            },
          ]}
        />
      </Panel>

      <Notice>
        Gifts received after 9:50pm stay pending until the next day&apos;s 10:00pm clearing. Amounts are your share
        after the platform fee; Monnify VAT (1.61–2.02%) is deducted from it before it reaches your bank. Older pending
        records outside the active window are not counted here.
      </Notice>

      <Panel title="Recent periods" description="Your net earnings, compared with the previous period.">
        <MetricRow
          metrics={[
            {
              label: "Today",
              value: formatNaira(dailyEarnings),
              hint: `Yesterday: ${formatNaira(previousDayEarnings)}`,
            },
            {
              label: "This week",
              value: formatNaira(weeklyEarnings),
              hint: `Last week: ${formatNaira(previousWeekEarnings)}`,
            },
            {
              label: "This month",
              value: formatNaira(monthlyEarnings),
              hint: `Last month: ${formatNaira(previousMonthEarnings)}`,
            },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {weeklyData.length > 0 ? (
          <EarningsChart data={weeklyData} title="Settled earnings by weekday" />
        ) : null}
        <EarningsChart data={monthlyData} title="Settled earnings by month" />
      </div>

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
                        <span className="text-zinc-500">Confirmed settled</span>
                        <span className="font-medium text-cyan-300">
                          {formatCurrency(confirmedSettledEarnings)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Pending earnings</span>
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
    </PageShell>
  )
}



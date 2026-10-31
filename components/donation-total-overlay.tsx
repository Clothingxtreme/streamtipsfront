"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import io from "socket.io-client"
import { motion } from "framer-motion"
import { getSocketUrl } from "@/lib/runtime-config"
import {
  fetchPublicDonationTotal,
  sanitizeOverlayDonationTotal,
  type OverlayDonationTotal,
} from "@/lib/overlay-state-client"
import { overlayLabelClass, overlayPanelClass } from "@/components/overlay-theme"
import { cn } from "@/lib/utils"

/*
 * Donation Total overlay.
 * The amount always comes from the server (GET /public/overlay/:id/donation-total), which sums the
 * creator's visible donations since their last "reset total". Socket events only trigger a re-fetch,
 * so the overlay never shows an amount the server has not confirmed.
 */

const POLL_CONNECTED_MS = 15000
const POLL_DISCONNECTED_MS = 8000
const MAX_BACKOFF_MS = 30000
const EVENT_REFETCH_DELAY_MS = 250
const EVENT_FOLLOW_UP_MS = 3000

export type DonationTotalStatus = "loading" | "ready" | "error" | "not_found"

function parseTime(value: string) {
  const time = value ? new Date(value).getTime() : 0
  return Number.isFinite(time) ? time : 0
}

export function formatNairaAmount(amount: number) {
  const hasFraction = Math.round(amount * 100) % 100 !== 0
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })
}

export function useLiveDonationTotal(creatorId: string) {
  const [total, setTotal] = useState<OverlayDonationTotal | null>(null)
  const [status, setStatus] = useState<DonationTotalStatus>("loading")
  const [socketConnected, setSocketConnected] = useState(false)
  const requestSeqRef = useRef(0)
  const appliedSeqRef = useRef(0)
  const resetEpochRef = useRef(0)
  const latestResetAtRef = useRef(0)
  const hasTotalRef = useRef(false)
  const socketConnectedRef = useRef(false)
  const failureDelayRef = useRef(POLL_DISCONNECTED_MS)
  const pollTimerRef = useRef<number | null>(null)
  const eventTimersRef = useRef<number[]>([])
  const refreshRef = useRef<() => void>(() => {})

  /** Accepts a server total unless a newer reset has already been applied. */
  const applyTotal = useCallback((next: OverlayDonationTotal) => {
    const nextResetAt = parseTime(next.resetAt)
    if (nextResetAt < latestResetAtRef.current) {
      return false
    }
    latestResetAtRef.current = nextResetAt
    hasTotalRef.current = true
    setTotal(next)
    setStatus("ready")
    return true
  }, [])

  const schedulePoll = useCallback((delay: number) => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
    }
    pollTimerRef.current = window.setTimeout(() => refreshRef.current(), delay)
  }, [])

  const refresh = useCallback(() => {
    if (!creatorId) {
      return
    }

    const seq = ++requestSeqRef.current
    const epochAtStart = resetEpochRef.current

    void fetchPublicDonationTotal(creatorId)
      .then((next) => {
        // Ignore out-of-order responses and anything requested before a reset event arrived.
        if (seq < appliedSeqRef.current || epochAtStart !== resetEpochRef.current) {
          return
        }
        appliedSeqRef.current = seq
        applyTotal(next)
        failureDelayRef.current = POLL_DISCONNECTED_MS
        schedulePoll(socketConnectedRef.current ? POLL_CONNECTED_MS : POLL_DISCONNECTED_MS)
      })
      .catch((error: unknown) => {
        if (seq !== requestSeqRef.current) {
          return
        }
        if (error instanceof Error && error.message === "not_found") {
          setStatus("not_found")
          schedulePoll(MAX_BACKOFF_MS)
          return
        }
        // Keep the last confirmed amount on screen; only flag the error when nothing is loaded.
        if (!hasTotalRef.current) {
          setStatus("error")
        }
        failureDelayRef.current = Math.min(MAX_BACKOFF_MS, Math.round(failureDelayRef.current * 1.5))
        schedulePoll(failureDelayRef.current)
      })
  }, [applyTotal, creatorId, schedulePoll])

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  const refreshSoon = useCallback(() => {
    eventTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    eventTimersRef.current = [
      window.setTimeout(() => refreshRef.current(), EVENT_REFETCH_DELAY_MS),
      // Second read picks up settlement-status changes that land just after the alert.
      window.setTimeout(() => refreshRef.current(), EVENT_FOLLOW_UP_MS),
    ]
  }, [])

  /** Apply a fresh total returned by the reset endpoint and drop any in-flight stale reads. */
  const applyReset = useCallback(
    (next: OverlayDonationTotal) => {
      resetEpochRef.current += 1
      appliedSeqRef.current = requestSeqRef.current + 1
      applyTotal(next)
    },
    [applyTotal],
  )

  useEffect(() => {
    if (!creatorId) {
      return
    }

    refreshRef.current()

    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
      auth: {
        sessionToken: "",
        overlayCreatorId: creatorId,
      },
    })

    const isForThisCreator = (data: { creatorId?: unknown; streamerId?: unknown } | null) => {
      const target = data?.creatorId ?? data?.streamerId
      return !target || String(target) === String(creatorId)
    }

    socket.on("connect", () => {
      socketConnectedRef.current = true
      setSocketConnected(true)
      // Catch up on anything missed while disconnected.
      refreshRef.current()
    })
    socket.on("disconnect", () => {
      socketConnectedRef.current = false
      setSocketConnected(false)
      schedulePoll(POLL_DISCONNECTED_MS)
    })
    socket.on("newDonation", (data) => {
      if (isForThisCreator(data)) {
        refreshSoon()
      }
    })
    socket.on("donationSettlementUpdated", (data) => {
      if (isForThisCreator(data)) {
        refreshSoon()
      }
    })
    socket.on("donationTotalReset", (data) => {
      const next = sanitizeOverlayDonationTotal(data)
      if (next) {
        applyReset(next)
      } else {
        refreshRef.current()
      }
    })

    return () => {
      socket.disconnect()
      socketConnectedRef.current = false
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
      eventTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      eventTimersRef.current = []
    }
  }, [applyReset, creatorId, refreshSoon, schedulePoll])

  return { total, status, socketConnected, refresh, applyReset }
}

export function DonationTotalCard({
  total,
  status,
  showSubtitle,
  className,
}: {
  total: OverlayDonationTotal | null
  status: DonationTotalStatus
  showSubtitle?: boolean
  className?: string
}) {
  const subtitleVisible = showSubtitle ?? total?.showSubtitle ?? true
  const amount = total?.amount ?? 0

  return (
    <div
      className={cn(overlayPanelClass, "inline-flex min-w-[240px] max-w-full flex-col px-5 py-4", className)}
      aria-live="polite"
      data-testid="donation-total-card"
    >
      <p className={overlayLabelClass}>Total donations</p>

      {total ? (
        <motion.p
          key={amount}
          initial={{ opacity: 0.55, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-1 flex items-baseline gap-2 whitespace-nowrap font-bold leading-none tracking-tight text-white tabular-nums"
          data-testid="donation-total-amount"
        >
          <span className="text-lg font-semibold text-zinc-400">NGN</span>
          <span className="text-[clamp(30px,9vw,52px)]">{formatNairaAmount(amount)}</span>
        </motion.p>
      ) : status === "not_found" ? (
        <p className="mt-2 text-sm text-zinc-400">Overlay link not found. Copy it again from StreamTips.</p>
      ) : status === "error" ? (
        <p className="mt-2 text-sm text-zinc-400">Connecting to StreamTips…</p>
      ) : (
        <div className="mt-2 h-10 w-40 animate-pulse rounded-lg bg-white/[0.06]" aria-label="Loading total" />
      )}

      {subtitleVisible && total ? <p className="mt-2 text-xs text-zinc-500">This stream</p> : null}
    </div>
  )
}

export function DonationTotalOverlay({ creatorId }: { creatorId: string }) {
  const { total, status } = useLiveDonationTotal(creatorId)

  // The root layout paints <body> with the theme background (white: `body { @apply bg-background }`
  // in globals.css). Browser sources only show through where html/body are transparent, so clear
  // both while this overlay is mounted, the same way the other overlays (components/overlay.tsx) do.
  useEffect(() => {
    const previousBodyBackground = document.body.style.background
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlBackground = document.documentElement.style.background

    document.body.style.background = "transparent"
    document.body.style.overflow = "hidden"
    document.documentElement.style.background = "transparent"

    return () => {
      document.body.style.background = previousBodyBackground
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.background = previousHtmlBackground
    }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent p-3 text-white">
      <DonationTotalCard total={total} status={status} />
    </div>
  )
}

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import io from "socket.io-client"
import { AnimatePresence, motion } from "framer-motion"
import { Crown, Sparkles } from "lucide-react"
import { DonationAlert } from "./donation-alert"
import { Leaderboard, type Contributor } from "./leaderboard"
import { ProgressBar } from "./progress-bar"
import { useAuth } from "@/app/context/AuthContext"
import { useOverlaySettings } from "@/app/context/OverlaySettingsContext"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { useCustomGifts } from "@/app/context/CustomGiftsContext"
import { getGiftSoundForAmount } from "@/lib/gifts"
import { getStoredSessionToken } from "@/lib/auth-client"
import { getSocketUrl } from "@/lib/runtime-config"
import {
  fetchPublicOverlayState,
  type ManualLeaderboardEntry,
  type PublicOverlayStatePayload,
} from "@/lib/overlay-state-client"
import { getPublicDonorDisplayName } from "@/lib/donor-display"
import { getStreamerPublicAccountName } from "@/lib/account-display"
import type { ComboStyleId, OverlayAnchor, OverlayGradientConfig, PositionedOverlayObject } from "@/lib/overlay-customization"
import { cn } from "@/lib/utils"
import type { AppUser } from "@/lib/user"

interface Donation {
  id: string
  senderName: string
  amount: number
  timestamp: number
}

type IncomingDonation = {
  id?: string
  _id?: string
  sender?: string
  senderName?: string
  displayName?: string
  senderNameSource?: string
  amount: unknown
  manual?: boolean
  provider?: string
  fundsFlow?: string
  paymentStatus?: string
  walletStatus?: string
  status?: string
  transactionReference?: string
  date?: string
  createdAt?: string | Date
}

const previewDonations = [
  { senderName: "RoseStorm", amount: 15 },
  { senderName: "MoneyRainHQ", amount: 7500 },
  { senderName: "UniverseDrop", amount: 700000 },
]
const DEFAULT_ALERT_VISIBLE_MS = 5000
const PREMIUM_ALERT_VISIBLE_MS = 10000
const PREMIUM_ALERT_MIN_AMOUNT = 5000
const DONATION_BACKFILL_WINDOW_MS = 10 * 60 * 1000

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

function getAudioContextClass() {
  if (typeof window === "undefined") {
    return null
  }

  const browserWindow = window as BrowserWindow
  return browserWindow.AudioContext || browserWindow.webkitAudioContext || null
}

function buildGiftChord(amount: number) {
  if (amount >= 700000) return [392, 523.25, 783.99]
  if (amount >= 220000) return [329.63, 493.88, 659.25]
  if (amount >= 15000) return [293.66, 440, 587.33]
  if (amount >= 1500) return [261.63, 392, 523.25]
  return [220, 329.63, 440]
}

function playApplauseNoise(context: AudioContext, startTime: number, duration: number) {
  const sampleRate = context.sampleRate
  const frameCount = Math.floor(sampleRate * duration)
  const buffer = context.createBuffer(1, frameCount, sampleRate)
  const channel = buffer.getChannelData(0)

  for (let i = 0; i < frameCount; i += 1) {
    const decay = 1 - i / frameCount
    channel[i] = (Math.random() * 2 - 1) * decay
  }

  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gainNode = context.createGain()
  const tremolo = context.createOscillator()
  const tremoloDepth = context.createGain()

  source.buffer = buffer
  filter.type = "bandpass"
  filter.frequency.setValueAtTime(1800, startTime)
  filter.Q.setValueAtTime(0.8, startTime)

  tremolo.type = "square"
  tremolo.frequency.setValueAtTime(11, startTime)
  tremoloDepth.gain.setValueAtTime(0.035, startTime)

  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.075, startTime + 0.04)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)

  tremolo.connect(tremoloDepth)
  tremoloDepth.connect(gainNode.gain)

  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(context.destination)

  source.start(startTime)
  source.stop(startTime + duration)
  tremolo.start(startTime)
  tremolo.stop(startTime + duration)
}

function playImpactSweep(context: AudioContext, startTime: number, amount: number) {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = amount >= 90000 ? "sawtooth" : "triangle"
  oscillator.frequency.setValueAtTime(amount >= 90000 ? 160 : 120, startTime)
  oscillator.frequency.exponentialRampToValueAtTime(amount >= 90000 ? 48 : 60, startTime + 0.7)

  gainNode.gain.setValueAtTime(0.0001, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.11, startTime + 0.03)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.72)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + 0.75)
}

function getAnchorClass(anchor: OverlayAnchor) {
  if (anchor === "top-left") return "left-6 top-6"
  if (anchor === "top-center") return "left-1/2 top-6"
  if (anchor === "top-right") return "right-6 top-6"
  if (anchor === "center") return "left-1/2 top-1/2"
  if (anchor === "bottom-left") return "bottom-6 left-6"
  if (anchor === "bottom-center") return "bottom-6 left-1/2"
  return "bottom-6 right-6"
}

function getAnchorTransform(anchor: OverlayAnchor) {
  if (anchor === "top-center" || anchor === "bottom-center") return "translateX(-50%)"
  if (anchor === "center") return "translate(-50%, -50%)"
  return ""
}

function overlayPositionStyle(position: PositionedOverlayObject, extraOffsetY = 0) {
  const baseTransform = getAnchorTransform(position.anchor)
  const offsetTransform = `translate(${position.offsetX}px, ${position.offsetY + extraOffsetY}px)`

  return {
    transform: [baseTransform, offsetTransform].filter(Boolean).join(" "),
  }
}

function overlayGradientStyle(gradient: OverlayGradientConfig) {
  return {
    background: `linear-gradient(135deg, ${gradient.start}, ${gradient.middle}, ${gradient.end})`,
  }
}

type DonationComboState = {
  count: number
  expiresAt: number
  lastAmount: number
  lastSenderName: string
  sequence: number
  status: "idle" | "active" | "ended"
}

function safeHexColor(value: string | undefined) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#00C3F7"
}

function parseDonationAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const normalized = String(value || "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : 0
}

function getDonationTimestamp(value: IncomingDonation) {
  const rawDate = value.date || value.createdAt
  const timestamp = rawDate ? new Date(rawDate).getTime() : Date.now()

  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

function getDonationIdentity(value: IncomingDonation) {
  const donationId = String(value._id || value.id || "").trim()

  if (donationId) {
    return donationId
  }

  const transactionReference = String(value.transactionReference || "").trim()

  if (transactionReference) {
    return transactionReference
  }

  return [
    getPublicDonorDisplayName(value.senderName || value.sender, value.senderNameSource),
    parseDonationAmount(value.amount),
    getDonationTimestamp(value),
  ].join(":")
}

function isSettledDonation(value: IncomingDonation) {
  const walletStatus = String(value.walletStatus || "available").toLowerCase()
  const status = String(value.status || "").toLowerCase()
  const provider = String(value.provider || "").toLowerCase()
  const fundsFlow = String(value.fundsFlow || "").toLowerCase()
  const paymentStatus = String(value.paymentStatus || "").toUpperCase()

  if (
    provider === "monnify" &&
    (fundsFlow === "direct_split" || fundsFlow === "wallet") &&
    (paymentStatus === "PAID" || Boolean(value.transactionReference)) &&
    !["rejected", "failed", "migration_hold"].includes(walletStatus) &&
    !["rejected", "failed"].includes(status)
  ) {
    return true
  }

  return !["pending", "pending_review", "rejected", "failed"].includes(walletStatus) &&
    !["pending", "pending_review", "rejected", "failed"].includes(status)
}

function isPendingDonation(value: IncomingDonation) {
  const walletStatus = String(value.walletStatus || "").toLowerCase()
  const status = String(value.status || "").toLowerCase()
  return ["pending", "pending_review"].includes(walletStatus) || ["pending", "pending_review"].includes(status)
}

function mergeContributor(contributors: Contributor[], incoming: Contributor) {
  const match = contributors.find((contributor) => contributor.name === incoming.name)

  if (match) {
    return contributors.map((contributor) =>
      contributor.name === incoming.name
        ? { ...contributor, amount: contributor.amount + incoming.amount }
        : contributor,
    )
  }

  return [...contributors, incoming]
}

function getComboStyleClasses(style: ComboStyleId) {
  if (style === "flame") {
    return {
      shell: "border-amber-200/35 bg-gradient-to-r from-red-500/85 via-amber-400/85 to-yellow-300/85 shadow-[0_0_44px_rgba(245,158,11,0.38)]",
      label: "text-amber-950/80",
      value: "text-white",
      bar: "from-yellow-100 via-orange-200 to-red-200",
      pulse: "bg-amber-300/30",
    }
  }

  if (style === "arcade") {
    return {
      shell: "border-fuchsia-200/35 bg-gradient-to-r from-violet-600/90 via-fuchsia-500/90 to-cyan-400/90 shadow-[0_0_44px_rgba(217,70,239,0.34)]",
      label: "text-white/75",
      value: "text-white",
      bar: "from-white via-cyan-100 to-fuchsia-100",
      pulse: "bg-fuchsia-300/28",
    }
  }

  return {
    shell: "border-cyan-200/35 bg-gradient-to-r from-cyan-500/85 via-sky-400/85 to-fuchsia-500/85 shadow-[0_0_44px_rgba(34,211,238,0.34)]",
    label: "text-cyan-950/75",
    value: "text-white",
    bar: "from-white via-cyan-100 to-fuchsia-100",
    pulse: "bg-cyan-200/28",
  }
}

function DonationComboOverlay({
  combo,
  durationSeconds,
  style,
}: {
  combo: DonationComboState
  durationSeconds: number
  style: ComboStyleId
}) {
  const visible = combo.status === "ended" || (combo.status === "active" && combo.count > 1)
  const styleClasses = getComboStyleClasses(style)

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key={`${combo.status}-${combo.sequence}`}
          initial={{ opacity: 0, y: 24, scale: 0.82 }}
          animate={{ opacity: 1, y: 0, scale: combo.status === "active" ? [1, 1.06, 1] : 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.9 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="pointer-events-none absolute bottom-8 left-1/2 z-40 w-[min(420px,calc(100vw-32px))] -translate-x-1/2"
        >
          <div className={cn("relative overflow-hidden rounded-[26px] border px-5 py-4 backdrop-blur-xl", styleClasses.shell)}>
            <motion.div
              className={cn("absolute -left-12 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full blur-2xl", styleClasses.pulse)}
              animate={{ x: ["0%", "420%", "0%"], opacity: [0.35, 0.85, 0.35] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className={cn("text-xs font-black uppercase tracking-[0.24em]", styleClasses.label)}>
                  {combo.status === "ended" ? "Donation Combo Ended" : "Donation Combo"}
                </p>
                <p className={cn("mt-1 text-4xl font-black leading-none drop-shadow", styleClasses.value)}>
                  {combo.status === "ended" ? `x${combo.count}` : `x${combo.count}`}
                </p>
              </div>
              <div className="text-right">
                <p className="max-w-[150px] truncate text-sm font-bold text-white">
                  {combo.lastSenderName || "Supporter"}
                </p>
                <p className="mt-1 text-sm font-black text-white/85">
                  NGN {Number(combo.lastAmount || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {combo.status === "active" ? (
              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-black/24">
                <motion.div
                  key={`timer-${combo.sequence}`}
                  className={cn("h-full rounded-full bg-gradient-to-r", styleClasses.bar)}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: durationSeconds, ease: "linear" }}
                />
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function manualLeaderboardEntryToContributor(entry: ManualLeaderboardEntry): Contributor | null {
  const name = entry.name.trim()
  const amount = parseDonationAmount(entry.amount)

  if (!name || amount <= 0) {
    return null
  }

  return {
    id: entry.id || `${name}-${entry.createdAt || amount}`,
    name,
    amount,
  }
}

type OverlayProps = {
  publicCreatorId?: string
  initialPublicState?: PublicOverlayStatePayload | null
  mode?: "full" | "gifts" | "goal" | "leaderboard" | "account"
}

export default function Overlay({
  publicCreatorId = "",
  initialPublicState = null,
  mode = "full",
}: OverlayProps) {
  type AlertDonation = {
    senderName: string
    amount: number
  }

  const { user: authenticatedUser } = useAuth()
  const { settings: storedSettings } = useOverlaySettings()
  const { customization: storedCustomization } = useOverlayCustomization()
  const { customGifts: storedCustomGifts } = useCustomGifts()
  const [publicState, setPublicState] = useState<PublicOverlayStatePayload | null>(
    initialPublicState,
  )
  const previewIndexRef = useRef(0)
  const previewStartedRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const shownDonationIdsRef = useRef<Set<string>>(new Set())
  const alertedDonationIdsRef = useRef<Set<string>>(new Set())
  const countedDonationIdsRef = useRef<Set<string>>(new Set())
  const overlayMountedAtRef = useRef(Date.now())
  const socketConnectedRef = useRef(false)
  const lastRealtimeEventAtRef = useRef(0)

  const [combo, setCombo] = useState<DonationComboState>({
    count: 0,
    expiresAt: 0,
    lastAmount: 0,
    lastSenderName: "",
    sequence: 0,
    status: "idle" as const,
  })
  const [queue, setQueue] = useState<Donation[]>([])
  const [currentAlert, setCurrentAlert] = useState<AlertDonation | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [manualLeaderboardContributors, setManualLeaderboardContributors] = useState<Contributor[]>([])
  const [totalDonations, setTotalDonations] = useState(0)
  const [isPortraitViewport, setIsPortraitViewport] = useState(false)
  const isPublicOverlay = Boolean(publicCreatorId)
  const user = (publicState?.user || authenticatedUser) as AppUser | null
  const settings = publicState?.settings || storedSettings
  const customization = publicState?.customization || storedCustomization
  const customGifts = publicState?.customGifts || storedCustomGifts
  const goalColor = safeHexColor(customization.goalColor)
  const showGiftLayer = mode === "full" || mode === "gifts"
  const showGoalLayer = mode === "full" || mode === "goal"
  const showLeaderboardLayer = mode === "full" || mode === "leaderboard"
  const showAccountLayer = mode === "full" || mode === "account"
  const canPlayGiftAudio = mode === "full" || mode === "gifts"
  const showIdleStage = mode === "full"
  const publicAccountName = getStreamerPublicAccountName(user)
  const comboDurationSeconds = Math.max(3, Math.min(30, Number(customization.comboDurationSeconds) || 10))
  const comboDurationMs = comboDurationSeconds * 1000

  const topSupporter = useMemo(
    () => [...contributors].sort((a, b) => b.amount - a.amount)[0] || null,
    [contributors],
  )

  const ensureAudioContext = useCallback(async () => {
    const AudioContextClass = getAudioContextClass()
    if (!AudioContextClass) {
      return null
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }

    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume()
      } catch {
        return audioContextRef.current
      }
    }

    return audioContextRef.current
  }, [])

  const playGiftSound = useCallback(
    async (amount: number) => {
      const giftSound = getGiftSoundForAmount(amount, customGifts)

      if (giftSound?.soundUrl) {
        try {
          const audio = new Audio(giftSound.soundUrl)
          audio.volume = 0.95
          await audio.play()
          return
        } catch {
          // Fall back to the generated tone when a browser source blocks or cannot load custom audio.
        }
      }

      const context = await ensureAudioContext()
      if (!context || context.state !== "running") {
        return
      }

      const now = context.currentTime
      const notes = buildGiftChord(amount)

      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()

        oscillator.type = amount >= 90000 ? "triangle" : "sine"
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.08)

        gainNode.gain.setValueAtTime(0.0001, now + index * 0.08)
        gainNode.gain.exponentialRampToValueAtTime(0.12, now + index * 0.08 + 0.03)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.55)

        oscillator.connect(gainNode)
        gainNode.connect(context.destination)
        oscillator.start(now + index * 0.08)
        oscillator.stop(now + index * 0.08 + 0.58)
      })

      if (amount >= 5000) {
        playImpactSweep(context, now, amount)
        playApplauseNoise(context, now + 0.12, amount >= 90000 ? 1.8 : 1.2)
      }

      if (amount >= 15000) {
        const shimmer = context.createOscillator()
        const shimmerGain = context.createGain()

        shimmer.type = "triangle"
        shimmer.frequency.setValueAtTime(880, now + 0.18)
        shimmer.frequency.linearRampToValueAtTime(1320, now + 0.65)

        shimmerGain.gain.setValueAtTime(0.0001, now + 0.18)
        shimmerGain.gain.exponentialRampToValueAtTime(0.045, now + 0.24)
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)

        shimmer.connect(shimmerGain)
        shimmerGain.connect(context.destination)
        shimmer.start(now + 0.18)
        shimmer.stop(now + 0.92)
      }
    },
    [customGifts, ensureAudioContext],
  )

  useEffect(() => {
    const unlock = () => {
      void ensureAudioContext()
    }

    window.addEventListener("pointerdown", unlock)
    window.addEventListener("keydown", unlock)

    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [ensureAudioContext])

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

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    const syncViewportShape = () => {
      setIsPortraitViewport(window.innerHeight > window.innerWidth)
    }

    syncViewportShape()
    window.addEventListener("resize", syncViewportShape)
    return () => window.removeEventListener("resize", syncViewportShape)
  }, [])

  useEffect(() => {
    if (!isPublicOverlay || !publicCreatorId) {
      return
    }

    let cancelled = false
    let refreshDelayMs = 9000
    let timer: number | null = null
    let inFlight = false

    const scheduleNext = (delayMs: number) => {
      if (cancelled) {
        return
      }

      timer = window.setTimeout(runRefresh, delayMs)
    }

    const runRefresh = () => {
      if (cancelled || inFlight) {
        return
      }

      const now = Date.now()
      const isHidden = document.visibilityState === "hidden"
      const recentlyUpdatedBySocket =
        socketConnectedRef.current &&
        now - lastRealtimeEventAtRef.current < 15000

      if (isHidden || recentlyUpdatedBySocket) {
        scheduleNext(isHidden ? 25000 : 12000)
        return
      }

      inFlight = true
      void fetchPublicOverlayState(publicCreatorId)
        .then((state) => {
          if (!cancelled) {
            setPublicState(state)
          }
          refreshDelayMs = 9000
        })
        .catch(() => {
          refreshDelayMs = Math.min(30000, Math.round(refreshDelayMs * 1.5))
        })
        .finally(() => {
          inFlight = false
          scheduleNext(refreshDelayMs)
        })
    }

    scheduleNext(0)

    return () => {
      cancelled = true
      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [isPublicOverlay, publicCreatorId])

  useEffect(() => {
    if (!publicState?.donations) {
      return
    }

    const totals = new Map<string, number>()

    publicState.donations.forEach((donation) => {
      if (!isSettledDonation(donation)) {
        return
      }

      const senderName = getPublicDonorDisplayName(
        donation.senderName || donation.sender,
        donation.senderNameSource,
      )
      totals.set(senderName, (totals.get(senderName) || 0) + parseDonationAmount(donation.amount))
    })

    const savedManualContributors = (publicState.manualLeaderboardEntries || [])
      .map(manualLeaderboardEntryToContributor)
      .filter((contributor): contributor is Contributor => Boolean(contributor))
    const savedManualIds = new Set(savedManualContributors.map((contributor) => contributor.id))
    const localOnlyManualContributors = manualLeaderboardContributors.filter(
      (contributor) => !savedManualIds.has(contributor.id),
    )
    const manualContributors = [...savedManualContributors, ...localOnlyManualContributors]

    const persistentContributors = manualContributors.reduce(
      (current, contributor) => mergeContributor(current, contributor),
      Array.from(totals.entries()).map(([name, amount]) => ({
        id: name,
        name,
        amount,
      })),
    )
    const persistentManualTotal = manualContributors.reduce(
      (total, contributor) => total + contributor.amount,
      0,
    )

    setContributors(persistentContributors)
    setTotalDonations(
      publicState.donations.reduce(
        (total, donation) =>
          isSettledDonation(donation) ? total + parseDonationAmount(donation.amount) : total,
        0,
      ) + persistentManualTotal,
    )
  }, [manualLeaderboardContributors, publicState?.donations, publicState?.manualLeaderboardEntries])

  const processDonation = useCallback(
    (
      incoming: IncomingDonation,
      options: { updateTotals?: boolean; forceAlert?: boolean; queueAlert?: boolean } = {},
    ) => {
      const { updateTotals = true, forceAlert = false, queueAlert = true } = options
      const donation = {
        senderName: getPublicDonorDisplayName(
          incoming.senderName || incoming.sender,
          incoming.senderNameSource,
        ),
        amount: parseDonationAmount(incoming.amount),
      }
      const settledDonation = isSettledDonation(incoming)
      const allowPendingAlert = forceAlert && isPendingDonation(incoming)

      if (!settledDonation && !allowPendingAlert) {
        return
      }

      if (donation.amount <= 0) {
        return
      }

      const fullDonation: Donation = {
        ...donation,
        id: getDonationIdentity(incoming),
        timestamp: getDonationTimestamp(incoming),
      }

      if (settings.sounds && canPlayGiftAudio) {
        void playGiftSound(fullDonation.amount)
      }

      if (updateTotals && settledDonation && !countedDonationIdsRef.current.has(fullDonation.id)) {
        countedDonationIdsRef.current.add(fullDonation.id)
        setTotalDonations((current) => current + fullDonation.amount)

        if (incoming.manual) {
          setManualLeaderboardContributors((current) =>
            mergeContributor(current, {
              id: fullDonation.id,
              name: fullDonation.senderName,
              amount: fullDonation.amount,
            }),
          )
        }

        setContributors((current) => {
          return mergeContributor(current, {
            id: fullDonation.id,
            name: fullDonation.senderName,
            amount: fullDonation.amount,
          })
        })
      }

      if (customization.showDonationCombo) {
        const now = Date.now()
        setCombo((current) => {
          const isActiveCombo = current.status === "active" && now <= current.expiresAt

          return {
            count: isActiveCombo ? current.count + 1 : 1,
            expiresAt: now + comboDurationMs,
            lastAmount: fullDonation.amount,
            lastSenderName: fullDonation.senderName,
            sequence: current.sequence + 1,
            status: "active",
          }
        })
      } else {
        setCombo((current) => ({ ...current, count: 0, expiresAt: 0, status: "idle" }))
      }

      if (queueAlert && (settings.animations || forceAlert)) {
        setQueue((current) => {
          if (fullDonation.amount >= 15000) {
            return [fullDonation, ...current]
          }

          return [...current, fullDonation]
        })
      }
    },
    [
      canPlayGiftAudio,
      comboDurationMs,
      customization.showDonationCombo,
      playGiftSound,
      settings.animations,
      settings.sounds,
    ],
  )

  useEffect(() => {
    if (!customization.showDonationCombo) {
      setCombo((current) => ({ ...current, count: 0, expiresAt: 0, status: "idle" }))
      return
    }

    if (combo.status !== "active") {
      return
    }

    const timeout = window.setTimeout(() => {
      setCombo((current) => {
        if (current.status !== "active" || current.sequence !== combo.sequence) {
          return current
        }

        if (current.count <= 1) {
          return { ...current, count: 0, expiresAt: 0, status: "idle" }
        }

        return {
          ...current,
          expiresAt: 0,
          sequence: current.sequence + 1,
          status: "ended",
        }
      })
    }, Math.max(0, combo.expiresAt - Date.now()))

    return () => window.clearTimeout(timeout)
  }, [combo.expiresAt, combo.sequence, combo.status, customization.showDonationCombo])

  useEffect(() => {
    if (combo.status !== "ended") {
      return
    }

    const timeout = window.setTimeout(() => {
      setCombo((current) =>
        current.status === "ended"
          ? { ...current, count: 0, expiresAt: 0, status: "idle" }
          : current,
      )
    }, 2200)

    return () => window.clearTimeout(timeout)
  }, [combo.status])

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
      auth: {
        sessionToken: isPublicOverlay ? "" : getStoredSessionToken(),
        overlayCreatorId: isPublicOverlay ? publicCreatorId : "",
      },
    })

    socket.on("newDonation", (data) => {
      if (publicCreatorId && data.creatorId && String(data.creatorId) !== String(publicCreatorId)) {
        return
      }
      lastRealtimeEventAtRef.current = Date.now()

      const incomingDonation = {
        id: data.id,
        _id: data._id,
        senderName: data.senderName || data.sender,
        senderNameSource: data.senderNameSource,
        amount: data.amount,
        provider: data.provider,
        fundsFlow: data.fundsFlow,
        paymentStatus: data.paymentStatus,
        walletStatus: data.walletStatus,
        status: data.status,
        transactionReference: data.transactionReference,
        manual: Boolean(data.manual),
        date: data.date,
        createdAt: data.createdAt,
      }
      const settledDonation = isSettledDonation(incomingDonation)

      shownDonationIdsRef.current.add(getDonationIdentity(incomingDonation))
      processDonation(
        incomingDonation,
        settledDonation
          ? { queueAlert: false }
          : { updateTotals: false, forceAlert: false, queueAlert: false },
      )
    })
    socket.on("overlayAlert", (data) => {
      if (publicCreatorId && data.streamerId && String(data.streamerId) !== String(publicCreatorId)) {
        return
      }

      const incomingDonation = {
        id: data.id,
        _id: data._id,
        senderName: data.senderName || data.displayName || data.sender,
        amount: data.amount,
        provider: data.provider,
        fundsFlow: data.fundsFlow,
        paymentStatus: data.paymentStatus,
        walletStatus: data.walletStatus || data.status || "available",
        status: data.status || "available",
        transactionReference: data.transactionReference,
        manual: Boolean(data.manual),
        date: data.date,
        createdAt: data.createdAt,
      }
      const donationIdentity = getDonationIdentity(incomingDonation)

      if (alertedDonationIdsRef.current.has(donationIdentity)) {
        return
      }

      alertedDonationIdsRef.current.add(donationIdentity)
      shownDonationIdsRef.current.add(donationIdentity)
      lastRealtimeEventAtRef.current = Date.now()
      processDonation(
        incomingDonation,
        isSettledDonation(incomingDonation) ? { forceAlert: true } : { updateTotals: false, forceAlert: true },
      )
    })
    socket.on("connect", () => {
      socketConnectedRef.current = true
    })
    socket.on("disconnect", () => {
      socketConnectedRef.current = false
    })

    return () => {
      socketConnectedRef.current = false
      socket.disconnect()
    }
  }, [isPublicOverlay, processDonation, publicCreatorId])

  useEffect(() => {
    if (!isPublicOverlay || !publicState?.donations?.length) {
      return
    }

    const recentCutoff = Math.min(
      overlayMountedAtRef.current,
      Date.now() - DONATION_BACKFILL_WINDOW_MS,
    )
    const newDonations = [...publicState.donations]
      .sort((left, right) => getDonationTimestamp(left) - getDonationTimestamp(right))
      .filter((donation) => {
        const donationIdentity = getDonationIdentity(donation)

        if (shownDonationIdsRef.current.has(donationIdentity)) {
          return false
        }

        if (getDonationTimestamp(donation) < recentCutoff) {
          shownDonationIdsRef.current.add(donationIdentity)
          return false
        }

        return isSettledDonation(donation) && parseDonationAmount(donation.amount) > 0
      })

    newDonations.forEach((donation) => {
      shownDonationIdsRef.current.add(getDonationIdentity(donation))
      processDonation(donation, { forceAlert: true })
    })
  }, [isPublicOverlay, processDonation, publicState?.donations])

  useEffect(() => {
    if (!settings.animations) {
      setQueue([])
      setCurrentAlert(null)
      setShowAlert(false)
    }
  }, [settings.animations])

  useEffect(() => {
    if (queue.length === 0 || showAlert) {
      return
    }

    const [nextDonation, ...rest] = queue
    setQueue(rest)
    setCurrentAlert(nextDonation)
    setShowAlert(true)
  }, [queue, showAlert])

  useEffect(() => {
    if (!showAlert || !currentAlert) {
      return
    }

    const alertDuration =
      currentAlert.amount >= PREMIUM_ALERT_MIN_AMOUNT
        ? PREMIUM_ALERT_VISIBLE_MS
        : DEFAULT_ALERT_VISIBLE_MS

    const timer = window.setTimeout(() => {
      setShowAlert(false)
      setCurrentAlert(null)
    }, alertDuration)

    return () => window.clearTimeout(timer)
  }, [currentAlert, showAlert])

  useEffect(() => {
    if (!settings.preview || isPublicOverlay) {
      previewStartedRef.current = false
      return
    }

    const sendPreviewDonation = () => {
      const donation = previewDonations[previewIndexRef.current % previewDonations.length]
      previewIndexRef.current += 1
      processDonation(donation, { updateTotals: false })
    }

    if (!previewStartedRef.current) {
      sendPreviewDonation()
      previewStartedRef.current = true
    }

    const timer = window.setInterval(sendPreviewDonation, 12000)
    return () => window.clearInterval(timer)
  }, [isPublicOverlay, processDonation, settings.preview])

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent text-white">
      {showIdleStage && customization.showAmbientScene ? (
        <div className="absolute inset-0">
          <div className="absolute left-[8%] top-[15%] h-40 w-40 rounded-full bg-fuchsia-400/12 blur-3xl" />
          <div className="absolute right-[10%] top-[10%] h-48 w-48 rounded-full bg-sky-400/12 blur-3xl" />
          <div className="absolute bottom-[12%] left-[16%] h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />

          {Array.from({ length: 16 }).map((_, index) => (
            <motion.div
              key={`ambient-orb-${index}`}
              className="absolute rounded-full bg-white/22"
              style={{
                height: index % 3 === 0 ? 5 : 3,
                width: index % 3 === 0 ? 5 : 3,
                left: `${6 + ((index * 11) % 86)}%`,
                top: `${8 + ((index * 7) % 76)}%`,
                boxShadow: "0 0 18px rgba(255,255,255,0.18)",
              }}
              animate={{ opacity: [0.18, 0.8, 0.18], y: [0, -10, 0] }}
              transition={{ duration: 3 + index * 0.18, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative h-full p-6 lg:p-8">
        {showGoalLayer && customization.showGoal ? (
          <div
            className={cn(
              "absolute z-20 w-[min(720px,calc(100vw-32px))] rounded-[22px] border border-white/14 px-4 py-3 shadow-[0_0_34px_rgba(34,211,238,0.08)] backdrop-blur-xl",
              getAnchorClass(customization.goalPosition.anchor),
            )}
            style={{
              ...overlayGradientStyle(customization.goalGradient),
              opacity: customization.goalOpacity,
              ...overlayPositionStyle(customization.goalPosition),
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/65">
                  Stream Goal
                </p>
                <p className="text-base font-bold text-white">{customization.goalTitle}</p>
              </div>
              {mode === "full" && customization.showTopSupporter && topSupporter ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/15 px-4 py-2 text-sm text-white/88">
                  <Crown className="h-4 w-4 text-yellow-300" />
                  <span className="font-semibold">{topSupporter.name}</span>
                  <span className="text-white/60">leading</span>
                </div>
              ) : null}
            </div>

            <ProgressBar
              currentAmount={totalDonations}
              goalAmount={customization.goalAmount}
              title={customization.goalTitle}
              accentColor={goalColor}
              compact
              playCompletionSound={settings.sounds}
            />
          </div>
        ) : null}

        {showLeaderboardLayer && customization.showLeaderboard ? (
          <div
            className={cn(
              "absolute z-20 w-[320px]",
              getAnchorClass(customization.leaderboardPosition.anchor),
            )}
            style={overlayPositionStyle(customization.leaderboardPosition)}
          >
            <div
              className="rounded-[30px] p-[1px]"
              style={{
                ...overlayGradientStyle(customization.leaderboardGradient),
                opacity: customization.leaderboardOpacity,
              }}
            >
              <div className="rounded-[30px] bg-black/28 p-1 backdrop-blur-xl">
                <Leaderboard
                  contributors={contributors}
                  maxItems={customization.leaderboardDisplayMode === "champion" ? 1 : 5}
                />
              </div>
            </div>
          </div>
        ) : null}

        {showAccountLayer && customization.showAccountDetails && user?.virtualAccount?.accountNumber ? (
          <div
            className={cn(
              "absolute z-20 w-[340px] rounded-[28px] border border-white/14 px-5 py-4 text-white shadow-[0_0_40px_rgba(0,0,0,0.12)] backdrop-blur-xl",
              getAnchorClass(customization.accountPosition.anchor),
            )}
            style={{
              ...overlayGradientStyle(customization.accountGradient),
              opacity: customization.accountOpacity,
              ...overlayPositionStyle(customization.accountPosition),
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">
              Virtual Account
            </p>
            <p className="mt-2 text-lg font-bold text-white">
              {publicAccountName}
            </p>
            <p className="mt-2 font-mono text-2xl font-black tracking-[0.12em] text-white">
              {user.virtualAccount.accountNumber}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3 text-sm text-white/85">
              <span>{user.virtualAccount.bankName || "Paystack"}</span>
              <span>{user.virtualAccount.provider || "Paystack"}</span>
            </div>
          </div>
        ) : null}

        {customization.showDonationCombo ? (
          <DonationComboOverlay
            combo={combo}
            durationSeconds={comboDurationSeconds}
            style={customization.comboStyle}
          />
        ) : null}

        {showGiftLayer ? (
          <div className="relative flex h-full items-center justify-center">
            {currentAlert ? (
              <div
                className={cn(
                  "absolute z-10",
                  getAnchorClass(customization.alertPosition.anchor),
                )}
                style={overlayPositionStyle(
                  customization.alertPosition,
                  isPortraitViewport ? 140 : 0,
                )}
              >
                <DonationAlert
                  senderName={currentAlert.senderName}
                  amount={currentAlert.amount}
                  comboCount={combo.count}
                  isVisible={showAlert}
                  giftPack={customization.giftPack}
                  gradient={customization.alertGradient}
                  customGifts={customGifts}
                />
              </div>
            ) : showIdleStage ? (
              <div className="pointer-events-none text-center">
                <motion.div
                  animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full border border-white/16 bg-white/8 backdrop-blur-md"
                >
                  <Sparkles className="h-10 w-10 text-fuchsia-200" />
                </motion.div>
                <p className="text-sm font-semibold uppercase tracking-[0.36em] text-white/45">
                  Live Gift Overlay
                </p>
                <p className="mt-2 text-2xl font-black text-white/85">
                  Waiting for the next gift drop
                </p>
                <p className="mt-2 text-sm text-white/55">
                  The stage stays live for OBS, combos, leaderboard, and goal tracking.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}


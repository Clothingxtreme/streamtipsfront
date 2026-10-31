"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import {
  BookOpen,
  CreditCard,
  Crown,
  ExternalLink,
  Gift,
  ListOrdered,
  RotateCcw,
  Sigma,
  Target,
  Trophy,
} from "lucide-react"
import { useAuth } from "@/app/context/AuthContext"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { useOverlaySettings } from "@/app/context/OverlaySettingsContext"
import { VideoGuideCard } from "@/components/dashboard/video-guide-card"
import {
  CopyButton,
  Notice,
  PageHeader,
  PageShell,
  Panel,
  focusRing,
  secondaryButton,
} from "@/components/dashboard/page-kit"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  DonationTotalCard,
  formatNairaAmount,
  useLiveDonationTotal,
} from "@/components/donation-total-overlay"
import { overlayLabelClass, overlayPanelClass } from "@/components/overlay-theme"
import { getStreamerPublicAccountName } from "@/lib/account-display"
import { giftPackThemes } from "@/lib/gifts"
import { getCreatorNickname } from "@/lib/nickname"
import type { GiftPackId } from "@/lib/overlay-customization"
import { resetOverlayDonationTotal, saveOverlayState } from "@/lib/overlay-state-client"
import { getOverlayUrl, type OverlayUrlMode } from "@/lib/runtime-config"
import { setupTutorialGuide } from "@/lib/video-guides"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "goal", label: "Donation Goal", icon: Target },
  { id: "account", label: "Account Card", icon: CreditCard },
  { id: "total", label: "Donation Total", icon: Sigma },
  { id: "gifts", label: "Gift Alerts", icon: Gift },
  { id: "setup", label: "Setup Guide", icon: BookOpen },
] as const

type TabId = (typeof TABS)[number]["id"]

const SOURCE_SIZES: Record<Exclude<OverlayUrlMode, "full">, string> = {
  gifts: "1920 × 1080",
  leaderboard: "400 × 520",
  goal: "780 × 160",
  account: "400 × 220",
  total: "420 × 160",
}

const GOAL_MIN = 1000
const GOAL_MAX = 1_000_000_000

const TabNavContext = createContext<(tab: TabId) => void>(() => {})

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value)
}

function validateGoalAmount(raw: string): { value?: number; error?: string } {
  const cleaned = raw.replace(/[,\s]/g, "").replace(/^NGN/i, "").replace(/^₦/, "")
  if (!cleaned) return { error: "Enter a goal amount." }
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return { error: "Use numbers only, for example 250000." }
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return { error: "Use numbers only, for example 250000." }
  if (value <= 0) return { error: "The goal must be more than zero." }
  if (value < GOAL_MIN) return { error: `The minimum goal is NGN ${GOAL_MIN.toLocaleString()}.` }
  if (value > GOAL_MAX) return { error: `The maximum goal is NGN ${GOAL_MAX.toLocaleString()}.` }
  return { value: Math.round(value) }
}

function formatDateTime(value: string) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}

/* ---------- small building blocks ---------- */

function OverlayUrlRow({ mode, label = "Overlay URL" }: { mode: OverlayUrlMode; label?: string }) {
  const { user } = useAuth()
  const goToTab = useContext(TabNavContext)
  const url = user?.id ? getOverlayUrl(user, mode) : ""
  const inputId = `overlay-url-${mode}`

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          readOnly
          value={url || "Sign in to see your link"}
          onFocus={(event) => event.currentTarget.select()}
          className="h-9 min-w-0 border-zinc-800 bg-zinc-950 font-mono text-xs text-zinc-200"
        />
        <div className="flex gap-2">
          <CopyButton value={url} label="Copy URL" ariaLabel={`Copy ${label}`} className="h-9 px-3" />
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-medium text-zinc-200 hover:border-white/20 hover:text-white",
                focusRing,
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open
            </a>
          ) : null}
        </div>
      </div>
      {mode !== "full" ? (
        <p className="text-xs text-zinc-500">
          Add it as a Browser Source, about {SOURCE_SIZES[mode]} px.{" "}
          <button
            type="button"
            onClick={() => goToTab("setup")}
            className={cn("underline underline-offset-2 hover:text-zinc-300", focusRing)}
          >
            Setup guide
          </button>
        </p>
      ) : null}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-zinc-950/60 px-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-white">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-zinc-500">{description}</p> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-purple-500"
      />
    </div>
  )
}

function PreviewFrame({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Preview</p>
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[repeating-conic-gradient(#18181b_0%_25%,#111113_0%_50%)] bg-[length:16px_16px] p-4">
        {children}
      </div>
      {note ? <p className="text-xs text-zinc-500">{note}</p> : null}
    </div>
  )
}

function ConfirmResetDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-zinc-400">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-white text-black hover:bg-zinc-200">
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ---------- tabs ---------- */

function LeaderboardTab() {
  const { customization, updateCustomization } = useOverlayCustomization()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetState, setResetState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const handleReset = async () => {
    setResetState("saving")
    try {
      await saveOverlayState({ leaderboardResetAt: new Date().toISOString() })
      setResetState("saved")
      window.setTimeout(() => setResetState("idle"), 2500)
    } catch {
      setResetState("error")
    }
  }

  const modes = [
    { id: "top5" as const, label: "Top 5", icon: ListOrdered },
    { id: "champion" as const, label: "#1 only", icon: Crown },
  ]

  return (
    <Panel title="Leaderboard" description="Your top gifters since the last leaderboard reset.">
      <div className="space-y-5">
        <ToggleRow
          id="toggle-leaderboard"
          label="Show leaderboard"
          description="Hide it without removing the browser source."
          checked={customization.showLeaderboard}
          onChange={(checked) => updateCustomization("showLeaderboard", checked)}
        />

        <div className="space-y-1.5">
          <p id="leaderboard-mode-label" className="text-sm font-medium text-zinc-300">
            Layout
          </p>
          <div
            role="radiogroup"
            aria-labelledby="leaderboard-mode-label"
            className="inline-grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1"
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
                event.preventDefault()
                const next = customization.leaderboardDisplayMode === "top5" ? "champion" : "top5"
                updateCustomization("leaderboardDisplayMode", next)
                const target = event.currentTarget.querySelector<HTMLButtonElement>(`[data-mode="${next}"]`)
                target?.focus()
              }
            }}
          >
            {modes.map((mode) => {
              const active = customization.leaderboardDisplayMode === mode.id
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  data-mode={mode.id}
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => updateCustomization("leaderboardDisplayMode", mode.id)}
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
                    active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white",
                    focusRing,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {mode.label}
                </button>
              )
            })}
          </div>
        </div>

        <OverlayUrlRow mode="leaderboard" label="Leaderboard URL" />

        <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Resetting starts a fresh leaderboard. Donation history and earnings are not affected.
          </p>
          <button
            type="button"
            className={cn(secondaryButton, "h-9 shrink-0")}
            disabled={resetState === "saving"}
            onClick={() => setConfirmOpen(true)}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {resetState === "saving" ? "Resetting…" : resetState === "saved" ? "Leaderboard reset" : "Reset leaderboard"}
          </button>
        </div>
        {resetState === "error" ? (
          <Notice tone="error">Could not reset the leaderboard. Check your connection and try again.</Notice>
        ) : null}
      </div>

      <ConfirmResetDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset the leaderboard?"
        description={<p>The leaderboard overlay will start empty and count gifts from now on. Your donation history and earnings stay the same.</p>}
        confirmLabel="Reset leaderboard"
        onConfirm={() => void handleReset()}
      />
    </Panel>
  )
}

function GoalTab() {
  const { customization, updateCustomization } = useOverlayCustomization()
  const [amountInput, setAmountInput] = useState(String(customization.goalAmount))
  const [amountFocused, setAmountFocused] = useState(false)
  const [amountError, setAmountError] = useState("")
  const [savedFlash, setSavedFlash] = useState(false)

  // Follow the saved value (e.g. after the server state loads) unless the creator is editing.
  useEffect(() => {
    if (!amountFocused) {
      setAmountInput(String(customization.goalAmount))
    }
  }, [amountFocused, customization.goalAmount])

  const commitAmount = () => {
    const result = validateGoalAmount(amountInput)
    if (result.error || result.value === undefined) {
      setAmountError(result.error || "Enter a valid amount.")
      return
    }
    setAmountError("")
    setAmountInput(String(result.value))
    if (result.value !== customization.goalAmount) {
      updateCustomization("goalAmount", result.value)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2000)
    }
  }

  return (
    <Panel
      title="Donation goal"
      description="A progress bar toward a goal you set for the stream."
    >
      <div className="space-y-5">
        <ToggleRow
          id="toggle-goal"
          label="Show goal"
          checked={customization.showGoal}
          onChange={(checked) => updateCustomization("showGoal", checked)}
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div className="space-y-1.5">
            <label htmlFor="goal-title" className="text-sm font-medium text-zinc-300">
              Goal title
            </label>
            <Input
              id="goal-title"
              value={customization.goalTitle}
              maxLength={80}
              onChange={(event) => updateCustomization("goalTitle", event.target.value)}
              placeholder="New gaming chair"
              className="border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="goal-amount" className="text-sm font-medium text-zinc-300">
              Goal amount (NGN)
            </label>
            <Input
              id="goal-amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={amountInput}
              aria-invalid={Boolean(amountError)}
              aria-describedby="goal-amount-help"
              onFocus={() => setAmountFocused(true)}
              onChange={(event) => {
                setAmountInput(event.target.value)
                if (amountError) setAmountError("")
              }}
              onBlur={() => {
                setAmountFocused(false)
                commitAmount()
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitAmount()
                }
              }}
              className={cn(
                "border-zinc-800 bg-zinc-950 text-white tabular-nums",
                amountError && "border-red-500/70 focus-visible:ring-red-500/40",
              )}
            />
            <p
              id="goal-amount-help"
              role={amountError ? "alert" : undefined}
              className={cn("text-xs", amountError ? "text-red-400" : "text-zinc-500")}
            >
              {amountError
                ? `${amountError} The overlay keeps NGN ${customization.goalAmount.toLocaleString()} until you fix it.`
                : savedFlash
                  ? "Saved."
                  : `Minimum NGN ${GOAL_MIN.toLocaleString()}. Saves when you leave the field or press Enter.`}
            </p>
          </div>
        </div>

        <ToggleRow
          id="toggle-top-supporter"
          label="Show top supporter"
          description="Adds the leading gifter's name to the goal bar in the all-in-one overlay."
          checked={customization.showTopSupporter}
          onChange={(checked) => updateCustomization("showTopSupporter", checked)}
        />

        <PreviewFrame note="Progress fills from real donations once the overlay is live.">
          <div className={cn(overlayPanelClass, "max-w-xl px-4 py-3")}>
            <p className={overlayLabelClass}>Stream Goal</p>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-bold text-white">{customization.goalTitle || "Donation goal"}</p>
              <p className="shrink-0 text-xs text-zinc-400 tabular-nums">
                Goal NGN {customization.goalAmount.toLocaleString()}
              </p>
            </div>
            <div className="mt-2 h-2.5 rounded-full border border-white/10 bg-white/[0.04]" />
          </div>
        </PreviewFrame>

        <OverlayUrlRow mode="goal" label="Donation goal URL" />
      </div>
    </Panel>
  )
}

function AccountTab() {
  const { customization, updateCustomization } = useOverlayCustomization()
  const { user } = useAuth()
  const nickname = getCreatorNickname(user)
  const accountName = getStreamerPublicAccountName(user)
  const accountNumber = user?.virtualAccount?.accountNumber || ""

  return (
    <Panel title="Account card" description="Shows viewers the account number they can send tips to.">
      <div className="space-y-5">
        <ToggleRow
          id="toggle-account"
          label="Show account card"
          checked={customization.showAccountDetails}
          onChange={(checked) => updateCustomization("showAccountDetails", checked)}
        />

        {user && !nickname ? (
          <Notice
            tone="warning"
            action={
              <Link href="/dashboard/settings" className="text-sm font-medium text-white underline underline-offset-4">
                Add nickname
              </Link>
            }
          >
            The card shows your account name because you haven&apos;t set a creator nickname.
          </Notice>
        ) : null}

        {accountNumber ? (
          <PreviewFrame>
            <div className={cn(overlayPanelClass, "w-full max-w-[340px] px-5 py-4")}>
              <p className={overlayLabelClass}>Virtual Account</p>
              {nickname ? (
                <>
                  <p className="mt-2 truncate text-2xl font-black leading-tight text-white">{nickname}</p>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-400">{accountName}</p>
                </>
              ) : (
                <p className="mt-2 text-lg font-bold text-white">{accountName}</p>
              )}
              <p className="mt-2 font-mono text-2xl font-black tracking-[0.12em] text-white">{accountNumber}</p>
              <p className="mt-2 truncate text-sm text-zinc-400">{user?.virtualAccount?.bankName || ""}</p>
            </div>
          </PreviewFrame>
        ) : (
          <Notice tone="info">The card appears on stream once your account number is ready.</Notice>
        )}

        <OverlayUrlRow mode="account" label="Account card URL" />
      </div>
    </Panel>
  )
}

function TotalTab() {
  const { user } = useAuth()
  const { customization, updateCustomization } = useOverlayCustomization()
  const { total, status, applyReset } = useLiveDonationTotal(user?.id ? String(user.id) : "")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetState, setResetState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  const handleReset = useCallback(async () => {
    setResetState("saving")
    try {
      const next = await resetOverlayDonationTotal()
      applyReset(next)
      setResetState("saved")
      window.setTimeout(() => setResetState("idle"), 2500)
    } catch {
      setResetState("error")
    }
  }, [applyReset])

  const lastReset = total?.resetAt ? formatDateTime(total.resetAt) : ""

  return (
    <Panel
      title="Donation total"
      description="A running total of donations received since your last reset."
    >
      <div className="space-y-5">
        <PreviewFrame
          note={
            status === "error"
              ? "Couldn't load the current total. It will retry automatically."
              : total
                ? `${total.count.toLocaleString()} donation${total.count === 1 ? "" : "s"} counted${lastReset ? ` since ${lastReset}` : " so far"}.`
                : undefined
          }
        >
          <DonationTotalCard
            total={total}
            status={status}
            showSubtitle={customization.showDonationTotalSubtitle}
          />
        </PreviewFrame>

        <ToggleRow
          id="toggle-total-subtitle"
          label={'Show "This stream" label'}
          description="Shown under the amount on the overlay."
          checked={customization.showDonationTotalSubtitle}
          onChange={(checked) => updateCustomization("showDonationTotalSubtitle", checked)}
        />

        <OverlayUrlRow mode="total" label="Donation total URL" />

        <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Reset at the start of each stream. Only this overlay&apos;s total goes back to zero.
          </p>
          <button
            type="button"
            className={cn(secondaryButton, "h-9 shrink-0")}
            disabled={resetState === "saving" || !user?.id}
            onClick={() => setConfirmOpen(true)}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {resetState === "saving" ? "Resetting…" : resetState === "saved" ? "Total reset" : "Reset total"}
          </button>
        </div>
        {resetState === "error" ? (
          <Notice tone="error">Could not reset the total. Nothing was changed. Try again.</Notice>
        ) : null}
      </div>

      <ConfirmResetDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset the donation total?"
        description={
          <>
            <p>
              The Donation Total overlay will go back to NGN 0
              {total ? ` (currently NGN ${formatNairaAmount(total.amount)})` : ""} and count new donations from now.
            </p>
            <p>Your donation history, earnings, payouts and leaderboard are not changed.</p>
          </>
        }
        confirmLabel="Reset total"
        onConfirm={() => void handleReset()}
      />
    </Panel>
  )
}

function GiftAlertsTab() {
  const { settings, updateSetting } = useOverlaySettings()
  const { customization, updateCustomization } = useOverlayCustomization()

  return (
    <Panel
      title="Gift alerts"
      description="Animated alerts that play when a donation arrives. The source stays transparent between alerts."
    >
      <div className="space-y-5">
        <ToggleRow
          id="toggle-gift-alerts"
          label="Show gift alerts"
          description="Turn alerts off without removing the browser source."
          checked={settings.animations}
          onChange={(checked) => void updateSetting("animations", checked)}
        />
        <ToggleRow
          id="toggle-gift-sounds"
          label="Play alert sounds"
          description="Sounds play through the browser source, so enable its audio in OBS or TikTok LIVE Studio."
          checked={settings.sounds}
          onChange={(checked) => void updateSetting("sounds", checked)}
        />

        <div className="space-y-1.5">
          <label htmlFor="gift-alert-style" className="text-sm font-medium text-zinc-300">
            Animation style
          </label>
          <Select
            value={customization.giftPack}
            onValueChange={(value) => updateCustomization("giftPack", value as GiftPackId)}
          >
            <SelectTrigger id="gift-alert-style" className="w-full border-zinc-800 bg-zinc-950 text-white sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-900">
              {giftPackThemes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id} className="text-white focus:bg-zinc-800 focus:text-white">
                  {theme.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">
            {giftPackThemes.find((theme) => theme.id === customization.giftPack)?.description || ""}{" "}
            <Link href="/dashboard/custom-gifts" className="underline underline-offset-2 hover:text-zinc-300">
              Create a custom gift
            </Link>
          </p>
        </div>

        <OverlayUrlRow mode="gifts" label="Gift alerts URL" />
      </div>
    </Panel>
  )
}

function SetupGuideTab() {
  const { customization, updateCustomization } = useOverlayCustomization()

  const steps: Array<{ title: string; body: ReactNode }> = [
    { title: "Pick an overlay", body: "Open its tab here and turn it on." },
    { title: "Copy its URL", body: "Each overlay has its own link, so you can place them separately." },
    {
      title: "Add a browser source",
      body: (
        <>
          <span className="font-medium text-zinc-200">OBS:</span> Sources → + → Browser, then paste the URL.{" "}
          <span className="font-medium text-zinc-200">TikTok LIVE Studio:</span> Add source → Link (browser source),
          then paste the URL.
        </>
      ),
    },
    { title: "Set the size", body: "Use the sizes below, then drag the source where you want it." },
    {
      title: "Keep it active",
      body: "Leave the source visible. In OBS, turn off “Shutdown source when not visible” so it keeps updating.",
    },
  ]

  const sizes: Array<{ label: string; size: string }> = [
    { label: "Leaderboard", size: SOURCE_SIZES.leaderboard },
    { label: "Donation goal", size: SOURCE_SIZES.goal },
    { label: "Account card", size: SOURCE_SIZES.account },
    { label: "Donation total", size: SOURCE_SIZES.total },
    { label: "Gift alerts / all-in-one", size: "1920 × 1080 (your canvas size)" },
  ]

  const troubleshooting = [
    ["Source is blank", "Check the whole URL was pasted, then refresh the source (OBS: right-click → Refresh)."],
    ["Not updating", "Make sure the source is visible and your internet is on. It reconnects on its own."],
    ["Shows another creator", "Copy the URL again from this page while signed in to your account."],
    ["Text is cut off", "Make the browser source wider or taller."],
    ["Total didn’t reset", "Wait a few seconds or refresh the source. Resets are saved on our server."],
  ]

  return (
    <div className="space-y-5">
      <Panel title="Add an overlay to your stream">
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-semibold text-zinc-200">
                {index + 1}
              </span>
              <div className="min-w-0 text-sm">
                <p className="font-medium text-white">{step.title}</p>
                <p className="mt-0.5 text-zinc-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recommended sizes" description="Width × height in pixels.">
          <dl className="divide-y divide-white/[0.06] text-sm">
            {sizes.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 py-2">
                <dt className="text-zinc-400">{item.label}</dt>
                <dd className="text-right font-medium text-white tabular-nums">{item.size}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Troubleshooting">
          <dl className="space-y-3 text-sm">
            {troubleshooting.map(([problem, fix]) => (
              <div key={problem}>
                <dt className="font-medium text-white">{problem}</dt>
                <dd className="mt-0.5 text-zinc-400">{fix}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <Panel
        title="Gift alerts and all-in-one overlay"
        description="Gift alerts stay transparent until a donation arrives. The all-in-one link shows every enabled overlay in one source."
      >
        <div className="space-y-4">
          <OverlayUrlRow mode="gifts" label="Gift alerts URL" />
          <OverlayUrlRow mode="full" label="All-in-one URL" />
          <ToggleRow
            id="toggle-ambient"
            label="Ambient background"
            description="Soft motion behind the all-in-one overlay while waiting for gifts."
            checked={customization.showAmbientScene}
            onChange={(checked) => updateCustomization("showAmbientScene", checked)}
          />
        </div>
      </Panel>

      <Panel title="Setup video" description="A quick walkthrough of adding StreamTips to your stream.">
        <VideoGuideCard guide={setupTutorialGuide} compact />
      </Panel>
    </div>
  )
}

/* ---------- page ---------- */

export default function OverlaySettingsPage() {
  const [tab, setTab] = useState<TabId>("leaderboard")
  const tabListRef = useRef<HTMLDivElement>(null)

  // On narrow screens the tab row scrolls sideways; keep the selected tab visible
  // (e.g. when the page opens on ?tab=gifts or ?tab=setup).
  useEffect(() => {
    const active = tabListRef.current?.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
    const list = tabListRef.current
    if (!active || !list || list.scrollWidth <= list.clientWidth) return
    const left = active.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
    if (left < list.scrollLeft || left + active.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" })
    }
  }, [tab])

  // Keep the selected tab in the URL (?tab=...) so it can be linked to and survives reloads.
  useEffect(() => {
    const syncFromUrl = () => {
      const fromUrl = new URLSearchParams(window.location.search).get("tab")
      if (isTabId(fromUrl)) setTab(fromUrl)
    }
    syncFromUrl()
    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [])

  const changeTab = useCallback((value: string) => {
    if (!isTabId(value)) return
    setTab(value)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", value)
    window.history.replaceState(window.history.state, "", url.toString())
  }, [])

  const goToTab = useCallback(
    (value: TabId) => {
      changeTab(value)
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
    [changeTab],
  )

  return (
    <TabNavContext.Provider value={goToTab}>
    <PageShell data-tour="overlay-settings-main" className="max-w-4xl">
      <PageHeader
        title="Overlay Settings"
        description="Choose what appears on your stream. Each overlay has its own link for OBS or TikTok LIVE Studio."
      />

      <TabsPrimitive.Root value={tab} onValueChange={changeTab} className="space-y-4">
        <TabsPrimitive.List
          ref={tabListRef}
          aria-label="Overlay settings sections"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {TABS.map((item) => {
            const Icon = item.icon
            return (
              <TabsPrimitive.Trigger
                key={item.id}
                value={item.id}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-transparent px-3 text-sm font-medium text-zinc-400 transition-colors hover:text-white",
                  "data-[state=active]:border-white/10 data-[state=active]:bg-white/[0.06] data-[state=active]:text-white",
                  focusRing,
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </TabsPrimitive.Trigger>
            )
          })}
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="leaderboard" className="outline-none">
          <LeaderboardTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="goal" className="outline-none">
          <GoalTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="account" className="outline-none">
          <AccountTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="total" className="outline-none">
          <TotalTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="gifts" className="outline-none">
          <GiftAlertsTab />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content value="setup" className="outline-none">
          <SetupGuideTab />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </PageShell>
    </TabNavContext.Provider>
  )
}

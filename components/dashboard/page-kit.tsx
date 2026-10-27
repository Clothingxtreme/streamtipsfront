"use client"

import { useState, type ComponentProps, type ReactNode } from "react"
import { AlertTriangle, Check, CheckCircle2, Copy, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/*
 * Shared building blocks for creator dashboard pages: one page width, one header style, one card style,
 * compact metric rows, and consistent notice / empty / copy affordances. Pages keep their own data logic.
 */

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"

export function PageShell({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8", className)} {...props}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-zinc-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  bodyClassName?: string
}) {
  return (
    <section
      className={cn("rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 sm:p-6", className)}
      {...props}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold text-white">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export type Metric = {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: "default" | "positive" | "warning" | "muted"
}

const metricTone: Record<NonNullable<Metric["tone"]>, string> = {
  default: "text-white",
  positive: "text-emerald-300",
  warning: "text-amber-300",
  muted: "text-zinc-300",
}

/** A row of related figures inside one card, separated by dividers instead of separate cards. */
export function MetricRow({ metrics, className }: { metrics: Metric[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid divide-y divide-white/[0.06] sm:divide-x sm:divide-y-0",
        metrics.length === 2 && "sm:grid-cols-2",
        metrics.length === 3 && "sm:grid-cols-3",
        metrics.length >= 4 && "sm:grid-cols-2 sm:divide-y lg:grid-cols-4 lg:divide-y-0",
        className,
      )}
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0 py-3 first:pt-0 last:pb-0 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:pr-0">
          <dt className="text-xs font-medium text-zinc-500">{metric.label}</dt>
          <dd className={cn("mt-1 truncate text-2xl font-semibold tabular-nums", metricTone[metric.tone || "default"])}>
            {metric.value}
          </dd>
          {metric.hint ? <dd className="mt-1 text-xs text-zinc-500">{metric.hint}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

const noticeStyles = {
  info: { box: "border-white/[0.08] bg-white/[0.03] text-zinc-300", icon: Info, iconClass: "text-zinc-400" },
  success: { box: "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-100", icon: CheckCircle2, iconClass: "text-emerald-300" },
  warning: { box: "border-amber-400/20 bg-amber-500/[0.07] text-amber-100", icon: AlertTriangle, iconClass: "text-amber-300" },
  error: { box: "border-red-400/20 bg-red-500/[0.07] text-red-100", icon: XCircle, iconClass: "text-red-300" },
}

export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof noticeStyles
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const style = noticeStyles[tone]
  const Icon = style.icon
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", style.box, className)}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="leading-relaxed opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">{children}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  ariaLabel,
  className,
  onCopied,
  disabled,
}: {
  value: string
  label?: string
  copiedLabel?: string
  ariaLabel?: string
  className?: string
  onCopied?: () => void
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled || !value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          onCopied?.()
          window.setTimeout(() => setCopied(false), 2000)
        } catch {
          setCopied(false)
        }
      }}
      aria-label={copied ? copiedLabel : ariaLabel || label}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
        focusRing,
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? copiedLabel : label}
    </button>
  )
}

export const primaryButton = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60",
  focusRing,
)

export const secondaryButton = cn(
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
  focusRing,
)

/** Axis-friendly naira label: ₦0, ₦750, ₦1.5k, ₦12k, ₦1.2M (avoids repeated "₦0k / ₦1k" ticks). */
export function formatNairaTick(value: number) {
  const amount = Number(value) || 0
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `₦${trimDecimal(amount / 1_000_000)}M`
  if (abs >= 1_000) return `₦${trimDecimal(amount / 1_000)}k`
  return `₦${Math.round(amount).toLocaleString()}`
}

function trimDecimal(value: number) {
  return (Math.round(value * 10) / 10).toString()
}

/**
 * Percent change that is only meaningful when there is a previous value to compare with.
 * Returns null when the previous period is zero or missing so pages don't show "-100%" or "Infinity%".
 */
export function getPercentChange(current: number, previous: number | null | undefined) {
  if (!previous || !Number.isFinite(previous) || previous <= 0) return null
  const change = ((Number(current) || 0) - previous) / previous * 100
  return Number.isFinite(change) ? change : null
}

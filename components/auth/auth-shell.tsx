"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { CheckCircle2, Sparkles, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/** Shared frame for login and password pages; matches the registration page's compact layout. */
export function AuthShell({
  title,
  description,
  headerAction,
  children,
  footer,
}: {
  title: string
  description?: ReactNode
  headerAction?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#09090f] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(168,85,247,0.16),transparent_70%)]"
      />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[28rem] flex-col px-4 pb-8 pt-5 sm:px-6 sm:pt-10">
        <header className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-[18px] w-[18px] text-white" aria-hidden />
            </span>
            <span className="text-base font-bold tracking-tight">StreamTips</span>
          </Link>
          {headerAction ? <div className="text-sm text-zinc-400">{headerAction}</div> : null}
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-[22px]">{title}</h1>
          {description ? <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </section>

        {footer}

        <footer className="mt-6 space-y-2 text-center text-xs text-zinc-500">
          <p>StreamTips is an independent creator tool and is not affiliated with TikTok or ByteDance.</p>
          <p className="flex justify-center gap-4">
            <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
          </p>
        </footer>
      </div>
    </main>
  )
}

export function AuthMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const Icon = tone === "error" ? XCircle : CheckCircle2
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        tone === "error"
          ? "border-red-400/20 bg-red-500/[0.08] text-red-200"
          : "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200",
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "error" ? "text-red-400" : "text-emerald-400")} aria-hidden />
      <span>{children}</span>
    </div>
  )
}

export const authInputClass =
  "h-11 rounded-xl border-white/10 bg-white/[0.03] text-white shadow-none placeholder:text-zinc-500 hover:border-white/20 focus-visible:border-purple-400/60 focus-visible:ring-purple-500/20"

export const authPrimaryButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 text-sm font-semibold text-white outline-none transition-[filter] hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-pink-400/40 disabled:cursor-not-allowed disabled:opacity-70"

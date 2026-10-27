"use client"

import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AdminRewardsPage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">Admin controls</p>
        <h1 className="mt-2 text-3xl font-black text-white">Creator fee rewards disabled</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Milestone rewards, referral fee reductions, and automatic Monnify platform split updates have been turned off. Every creator remains on the standard 10% platform fee.
        </p>
      </div>

      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Fixed platform fee active</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">
              Referral codes and links still exist for tracking, but they no longer grant fee reductions or trigger Monnify split configuration updates.
            </p>
            <Button asChild className="mt-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to admin overview
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

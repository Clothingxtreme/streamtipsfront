"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/app/context/AuthContext"
import { authRequest } from "@/lib/auth-client"
import { getCreatorNickname, normalizeCreatorNickname } from "@/lib/nickname"
import {
  CopyButton,
  EmptyState,
  MetricRow,
  Notice,
  PageHeader,
  PageShell,
  Panel,
  secondaryButton,
} from "@/components/dashboard/page-kit"
import { cn } from "@/lib/utils"

type ReferralPayload = {
  referral: {
    code: string
    link: string
    previousCodes?: string[]
    total: number
    referredCreators: Array<{
      id: string
      name: string
      nickname?: string
      email: string
      totalDonations: number
      totalDonationCount?: number
    }>
  }
  progress: {
    totalAmount: number
    totalDonations: number
    uniqueSupporters: number
  }
}

function formatCurrency(value: number) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

// Fallback only; the backend returns the link built from its configured portal URL.
function getPublicReferralLink(code: string) {
  return `https://streamtips.live/register?ref=${encodeURIComponent(String(code || "").trim())}`
}

export default function CreatorReferralsPage() {
  const { user } = useAuth()
  const creatorNickname = getCreatorNickname(user)
  const [data, setData] = useState<ReferralPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadReferrals = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await authRequest("/rewards")
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not load referral details.")
      }

      setData(payload?.rewards || null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load referral details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReferrals()
  }, [])

  const referralLink = useMemo(
    () => data?.referral?.link || getPublicReferralLink(data?.referral?.code || ""),
    [data?.referral?.code, data?.referral?.link],
  )
  const previousCodes = (data?.referral?.previousCodes || []).filter(Boolean)

  return (
    <PageShell>
      <PageHeader
        title="Referrals"
        description="Share your link and see which creators joined through you. The platform fee stays at 10% for everyone."
      />

      {loading ? (
        <Panel aria-busy="true">
          <div className="space-y-3" aria-label="Loading referral details">
            <div className="h-4 w-40 animate-pulse rounded bg-white/[0.06] motion-reduce:animate-none" />
            <div className="h-8 w-64 animate-pulse rounded bg-white/[0.06] motion-reduce:animate-none" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-white/[0.04] motion-reduce:animate-none" />
          </div>
        </Panel>
      ) : error || !data ? (
        <Notice
          tone="error"
          action={
            <button type="button" onClick={() => void loadReferrals()} className={cn(secondaryButton, "h-8 px-3 text-xs")}>
              Try again
            </button>
          }
        >
          {error || "Referral details could not be loaded."}
        </Notice>
      ) : (
        <>
          <Panel title="Your referral link">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">Referring as</p>
                  {creatorNickname ? (
                    <p className="truncate text-base font-semibold text-white">{creatorNickname}</p>
                  ) : (
                    <p className="text-sm text-zinc-300">
                      No creator nickname yet.{" "}
                      <Link href="/dashboard/settings" className="font-medium text-white underline underline-offset-4">
                        Add one in Settings
                      </Link>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Code</p>
                    <p className="truncate font-mono text-lg font-semibold tracking-wide text-white">{data.referral.code}</p>
                  </div>
                  <CopyButton value={data.referral.code} ariaLabel="Copy referral code" />
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-purple-400/20 bg-purple-500/[0.06] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Link</p>
                    <p className="truncate text-sm text-white">{referralLink}</p>
                  </div>
                  <CopyButton value={referralLink} label="Copy link" ariaLabel="Copy referral link" />
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Your code is based on your nickname.
                {previousCodes.length
                  ? ` Links you shared with your earlier code${previousCodes.length === 1 ? "" : "s"} (${previousCodes.join(", ")}) still work.`
                  : ""}
              </p>
            </div>
          </Panel>

          <Panel>
            <MetricRow
              metrics={[
                { label: "Creators referred", value: Number(data.referral.total || 0).toLocaleString() },
                { label: "Your total received", value: formatCurrency(data.progress.totalAmount) },
                { label: "Your unique supporters", value: Number(data.progress.uniqueSupporters || 0).toLocaleString() },
              ]}
            />
          </Panel>

          <Panel title="Creators you referred">
            {data.referral.referredCreators.length ? (
              <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-zinc-500">
                    <tr className="border-b border-white/[0.06]">
                      <th scope="col" className="pb-2 font-medium">Creator</th>
                      <th scope="col" className="pb-2 font-medium">Email</th>
                      <th scope="col" className="pb-2 text-right font-medium">Total received</th>
                      <th scope="col" className="pb-2 text-right font-medium">Donations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {data.referral.referredCreators.map((creator) => {
                      const nickname = normalizeCreatorNickname(creator.nickname)
                      return (
                        <tr key={creator.id}>
                          <td className="py-3 pr-3">
                            <p className="font-medium text-white">{nickname || creator.name}</p>
                          </td>
                          <td className="py-3 pr-3 text-zinc-400">{creator.email || "-"}</td>
                          <td className="py-3 text-right font-semibold tabular-nums text-emerald-300">{formatCurrency(creator.totalDonations)}</td>
                          <td className="py-3 text-right tabular-nums text-zinc-400">{creator.totalDonationCount || 0}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No referred creators yet">
                When a creator signs up with your link, they&apos;ll appear here.
              </EmptyState>
            )}
          </Panel>
        </>
      )}
    </PageShell>
  )
}

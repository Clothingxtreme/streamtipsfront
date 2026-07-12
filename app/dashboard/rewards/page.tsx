"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Gift, Link2, Users } from "lucide-react"
import { authRequest } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

type ReferralPayload = {
  referral: {
    code: string
    link: string
    total: number
    referredCreators: Array<{
      id: string
      name: string
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

function getPublicReferralLink(code: string) {
  return `https://streamtips.live/register?ref=${encodeURIComponent(String(code || "").trim())}`
}

export default function CreatorReferralsPage() {
  const [data, setData] = useState<ReferralPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")

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
    () => getPublicReferralLink(data?.referral?.code || ""),
    [data?.referral?.code],
  )

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(""), 1800)
  }

  if (loading) {
    return <div className="p-8 text-white">Loading referral details...</div>
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-100">
          {error || "Referral details could not be loaded."}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5 sm:p-6 lg:p-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Referrals</p>
        <h1 className="mt-2 text-3xl font-black text-white">Referral link</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Share your creator link and keep track of creators who register through you. Platform fees remain fixed at 20%.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl bg-zinc-900/80 p-5">
          <div className="flex items-center gap-3">
            <Link2 className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-bold text-white">Your referral details</h2>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-lg bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Referral Code</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="truncate text-2xl font-black text-white">{data.referral.code}</p>
                <Button type="button" variant="outline" className="border-zinc-700 bg-zinc-950 text-white" onClick={() => void copyValue("code", data.referral.code)}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied === "code" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Referral Link</p>
              <p className="mt-2 truncate text-sm text-zinc-300">{referralLink}</p>
              <Button type="button" className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white" onClick={() => void copyValue("link", referralLink)}>
                <Copy className="mr-2 h-4 w-4" />
                {copied === "link" ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/80 p-5">
          <h2 className="text-xl font-bold text-white">Referral snapshot</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-black/20 p-4">
              <Users className="h-5 w-5 text-cyan-300" />
              <p className="mt-3 text-sm text-zinc-500">Creators referred</p>
              <p className="text-2xl font-black text-white">{data.referral.total}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-4">
              <Gift className="h-5 w-5 text-emerald-300" />
              <p className="mt-3 text-sm text-zinc-500">Your total received</p>
              <p className="text-2xl font-black text-white">{formatCurrency(data.progress.totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-black/20 p-4">
              <Users className="h-5 w-5 text-amber-300" />
              <p className="mt-3 text-sm text-zinc-500">Unique supporters</p>
              <p className="text-2xl font-black text-white">{data.progress.uniqueSupporters}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-zinc-900/80 p-5">
        <h2 className="text-xl font-bold text-white">Creators you referred</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-3">Creator</th>
                <th>Email</th>
                <th>Total received</th>
                <th>Donations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.referral.referredCreators.map((creator) => (
                <tr key={creator.id}>
                  <td className="py-4 font-semibold text-white">{creator.name}</td>
                  <td className="text-zinc-400">{creator.email || "-"}</td>
                  <td className="font-bold text-emerald-200">{formatCurrency(creator.totalDonations)}</td>
                  <td className="text-zinc-400">{creator.totalDonationCount || 0}</td>
                </tr>
              ))}
              {!data.referral.referredCreators.length ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500">No referred creators yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

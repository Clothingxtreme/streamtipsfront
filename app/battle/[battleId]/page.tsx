"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckCircle2, Link2, Swords } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authRequest } from "@/lib/auth-client"
import { useAuth } from "@/app/context/AuthContext"
import { type BattleSnapshot } from "@/lib/battle"
import { getApiBaseUrl } from "@/lib/runtime-config"

export default function BattleInvitePage() {
  const params = useParams<{ battleId: string }>()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [battle, setBattle] = useState<BattleSnapshot | null>(null)
  const [error, setError] = useState("")
  const [joining, setJoining] = useState(false)
  const battleId = String(params?.battleId || "").toUpperCase()

  useEffect(() => {
    if (!battleId) return
    void fetch(`${getApiBaseUrl()}/public/battle/${encodeURIComponent(battleId)}`)
      .then((response) => response.json())
      .then((payload) => setBattle(payload?.battle || null))
      .catch(() => setBattle(null))
  }, [battleId])

  const joinBattle = async () => {
    setJoining(true)
    setError("")
    try {
      const response = await authRequest("/battles/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Could not join battle.")
      router.push("/dashboard/live-battle")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not join battle.")
    } finally {
      setJoining(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <section className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 to-rose-500">
          <Swords className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-4xl font-black">Join Live Battle</h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Accept the invite to battle another StreamTips creator. Donations sent during the battle decide the winner.
        </p>

        <div className="mt-8 w-full rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2 text-fuchsia-100">
            <Link2 className="h-4 w-4" />
            <span className="text-sm uppercase tracking-[0.22em]">Battle invite</span>
          </div>
          <p className="mt-3 text-3xl font-black">{battleId}</p>
          <p className="mt-2 text-sm text-zinc-500">
            Status: {battle?.status || "loading"}
          </p>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isLoading ? (
              <Button disabled className="bg-zinc-800 text-zinc-400">Checking login...</Button>
            ) : isAuthenticated ? (
              <Button
                onClick={() => void joinBattle()}
                disabled={joining || battle?.status !== "waiting"}
                className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {joining ? "Joining..." : "Join Battle"}
              </Button>
            ) : (
              <Button asChild className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90">
                <Link href="/login">Log in to Join</Link>
              </Button>
            )}
            <Button asChild variant="outline" className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900">
              <Link href="/dashboard/live-battle">Open Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

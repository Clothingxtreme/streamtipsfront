"use client"

import { useEffect, useMemo, useState } from "react"
import { io } from "socket.io-client"
import {
  CheckCircle2,
  Copy,
  Crown,
  Flame,
  History,
  Link2,
  RadioTower,
  Swords,
  Trophy,
  Users,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authRequest, getStoredSessionToken } from "@/lib/auth-client"
import { getSocketUrl } from "@/lib/runtime-config"
import {
  formatBattlePoints,
  formatBattleTime,
  getBattleLeader,
  type BattleSnapshot,
} from "@/lib/battle"
import { cn } from "@/lib/utils"

type BattleHistoryItem = {
  battleId: string
  opponentId?: string
  result: "win" | "loss" | "draw"
  finalScore: number
  opponentScore: number
  moneyRaised: number
  durationSeconds: number
  finishedAt?: string
}

type RankingItem = {
  creatorId: string
  name: string
  profileImage?: string
  value: number
}

const durations = [
  { label: "3 minutes", value: "180" },
  { label: "5 minutes", value: "300" },
  { label: "10 minutes", value: "600" },
]

function money(value: number) {
  return `NGN ${(Number(value) || 0).toLocaleString()}`
}

function displayMode(battle?: BattleSnapshot | null) {
  if (!battle) return "Normal Mode"
  if (battle.doublePoints?.active) return "DOUBLE POINTS"
  if (battle.finalMinuteActive || battle.mode === "final_minute") return "FINAL MINUTE"
  if (battle.status === "countdown") return "Starting"
  return "Normal Mode"
}

export default function LiveBattleDashboard() {
  const [battle, setBattle] = useState<BattleSnapshot | null>(null)
  const [history, setHistory] = useState<BattleHistoryItem[]>([])
  const [rankings, setRankings] = useState<Record<string, RankingItem[]>>({})
  const [durationSeconds, setDurationSeconds] = useState("300")
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const leader = getBattleLeader(battle)

  const totalScore = useMemo(() => {
    return Math.max(1, (battle?.scores.left || 0) + (battle?.scores.right || 0))
  }, [battle])

  const loadDashboard = async () => {
    setLoading(true)
    setError("")
    try {
      const [dashboardResponse, rankingsResponse] = await Promise.all([
        authRequest("/battles/me"),
        authRequest("/battles/rankings?period=all"),
      ])
      const [dashboardData, rankingsData] = await Promise.all([
        dashboardResponse.json().catch(() => null),
        rankingsResponse.json().catch(() => null),
      ])

      if (!dashboardResponse.ok) {
        throw new Error(dashboardData?.error || "Could not load Live Battle.")
      }

      setBattle(dashboardData?.activeBattle || null)
      setHistory(Array.isArray(dashboardData?.history) ? dashboardData.history : [])
      setRankings({
        mostWins: rankingsData?.mostWins || [],
        highestAmountRaised: rankingsData?.highestAmountRaised || [],
        longestWinStreak: rankingsData?.longestWinStreak || [],
        largestSingleDonationReceived: rankingsData?.largestSingleDonationReceived || [],
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load Live Battle.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  useEffect(() => {
    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
      auth: { sessionToken: getStoredSessionToken() },
    })

    const updateBattle = (nextBattle: BattleSnapshot) => {
      setBattle(nextBattle)
    }

    socket.on("battle_created", updateBattle)
    socket.on("battle_joined", updateBattle)
    socket.on("battle_ready", updateBattle)
    socket.on("battle_started", updateBattle)
    socket.on("battle_updated", updateBattle)
    socket.on("battle_score_updated", updateBattle)
    socket.on("battle_mode_changed", updateBattle)
    socket.on("battle_finished", updateBattle)
    socket.on("battle_cancelled", updateBattle)
    socket.on("battle_timer", (payload) => {
      setBattle((current) =>
        current && current.battleId === payload.battleId
          ? {
              ...current,
              remainingSeconds: Number(payload.remainingSeconds) || 0,
              mode: payload.mode || current.mode,
              doublePoints: {
                ...(current.doublePoints || { active: false, remainingSeconds: 0 }),
                remainingSeconds: Number(payload.doublePointsRemainingSeconds) || 0,
              },
            }
          : current,
      )
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!battle?.battleId) return
    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
      auth: { sessionToken: getStoredSessionToken() },
    })
    socket.emit("battle_subscribe", { battleId: battle.battleId })
    socket.on("battle_updated", setBattle)
    return () => socket.disconnect()
  }, [battle?.battleId])

  const runAction = async (path: string, init: RequestInit = {}, successMessage = "") => {
    setSubmitting(true)
    setError("")
    setMessage("")
    try {
      const response = await authRequest(path, init)
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Battle request failed.")
      setBattle(data?.battle || null)
      setMessage(successMessage)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Battle request failed.")
    } finally {
      setSubmitting(false)
    }
  }

  const createBattle = () => {
    void runAction(
      "/battles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: Number(durationSeconds) }),
      },
      "Battle created. Share the invite link with your opponent.",
    )
  }

  const joinBattle = () => {
    void runAction(
      "/battles/join",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: joinCode }),
      },
      "Battle joined.",
    )
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-2 text-sm text-fuchsia-100">
            <Swords className="h-4 w-4" />
            Live Battle
          </div>
          <h1 className="mt-4 text-3xl font-black text-white">Live Battle Dashboard</h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Battle another StreamTips creator with real donations as the score. Built for TikTok LIVE co-host split-screen streams.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void loadDashboard()}
          className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
        >
          Refresh
        </Button>
      </header>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      {battle ? (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-fuchsia-200">{battle.status}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{battle.battleId}</h2>
              <p className="mt-1 text-sm text-zinc-500">{displayMode(battle)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {battle.status === "connected" || battle.status === "countdown" ? (
                <Button
                  onClick={() => void runAction(`/battles/${battle.battleId}/ready`, { method: "POST" }, "Ready sent.")}
                  disabled={submitting || battle.status === "countdown"}
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Ready
                </Button>
              ) : null}
              {battle.status === "active" ? (
                <Button
                  onClick={() => void runAction(`/battles/${battle.battleId}/double-points`, { method: "POST" }, "Double Points activated.")}
                  disabled={submitting || Boolean(battle.doublePoints?.active)}
                  className="bg-gradient-to-r from-orange-500 to-fuchsia-500 text-white hover:opacity-90"
                >
                  <Flame className="mr-2 h-4 w-4" />
                  Double Points
                </Button>
              ) : null}
              {["waiting", "connected", "countdown", "active"].includes(battle.status) ? (
                <Button
                  onClick={() => void runAction(`/battles/${battle.battleId}/cancel`, { method: "POST" }, "Battle cancelled.")}
                  disabled={submitting}
                  variant="outline"
                  className="border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          <BattleArena battle={battle} totalScore={totalScore} leader={leader} />

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <CopyField label="Invite link" value={battle.inviteLink} />
            <CopyField label="Battle overlay" value={battle.overlayLink} />
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Create Battle" icon={Swords}>
          <div className="space-y-4">
            <Select value={durationSeconds} onValueChange={setDurationSeconds}>
              <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900">
                {durations.map((duration) => (
                  <SelectItem key={duration.value} value={duration.value} className="text-white focus:bg-zinc-800 focus:text-white">
                    {duration.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={createBattle} disabled={submitting || Boolean(battle && ["waiting", "connected", "countdown", "active"].includes(battle.status))} className="w-full bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90">
              Create Battle
            </Button>
          </div>
        </Panel>

        <Panel title="Join Battle" icon={Users}>
          <div className="space-y-4">
            <Input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="BTL-XXXXXXXX or invite link"
              className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
            />
            <Button onClick={joinBattle} disabled={submitting || !joinCode.trim()} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90">
              Join Battle
            </Button>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel title="Battle History" icon={History}>
          <div className="space-y-3">
            {history.length ? history.map((item) => (
              <div key={item.battleId} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{item.battleId}</p>
                    <p className="text-sm text-zinc-500">{item.durationSeconds / 60} min • {money(item.moneyRaised)}</p>
                  </div>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase", item.result === "win" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : item.result === "loss" ? "border-red-400/20 bg-red-400/10 text-red-200" : "border-zinc-600 bg-zinc-900 text-zinc-200")}>{item.result}</span>
                </div>
              </div>
            )) : <EmptyText>No battles finished yet.</EmptyText>}
          </div>
        </Panel>

        <Panel title="Rankings" icon={Trophy}>
          <RankingBlock title="Most Wins" items={rankings.mostWins || []} />
          <RankingBlock title="Highest Raised" items={rankings.highestAmountRaised || []} currency />
          <RankingBlock title="Longest Win Streak" items={rankings.longestWinStreak || []} />
          <RankingBlock title="Largest Donation" items={rankings.largestSingleDonationReceived || []} currency />
        </Panel>
      </section>

      <Panel title="Settings" icon={RadioTower}>
        <div className="grid gap-4 md:grid-cols-3">
          <SettingTile label="Default duration" value="5 minutes" />
          <SettingTile label="Scoring" value="1 point per NGN 2" />
          <SettingTile label="Final minute" value="Visual only" />
        </div>
      </Panel>

      {loading ? <p className="text-sm text-zinc-500">Loading battle data...</p> : null}
    </div>
  )
}

function BattleArena({ battle, totalScore, leader }: { battle: BattleSnapshot; totalScore: number; leader: string }) {
  return (
    <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
      <BattleSide side="left" participant={battle.participants.left} score={battle.scores.left} totalScore={totalScore} leading={leader === "left"} />
      <div className="rounded-[24px] border border-white/10 bg-black/30 px-6 py-5 text-center">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Timer</p>
        <p className="mt-2 text-4xl font-black text-white">{formatBattleTime(battle.remainingSeconds)}</p>
        <p className={cn("mt-3 rounded-full px-4 py-2 text-sm font-bold", battle.doublePoints?.active ? "bg-orange-500 text-white" : battle.finalMinuteActive ? "bg-fuchsia-500 text-white" : "bg-white/10 text-zinc-200")}>{displayMode(battle)}</p>
      </div>
      <BattleSide side="right" participant={battle.participants.right} score={battle.scores.right} totalScore={totalScore} leading={leader === "right"} />
    </div>
  )
}

function BattleSide({ side, participant, score, totalScore, leading }: { side: "left" | "right"; participant: BattleSnapshot["participants"]["left"]; score: number; totalScore: number; leading: boolean }) {
  const percent = Math.min(100, Math.max(4, (score / totalScore) * 100))
  return (
    <div className={cn("rounded-[28px] border p-5 transition-all", leading ? "border-fuchsia-400/40 bg-fuchsia-400/10 shadow-[0_0_30px_rgba(217,70,239,0.2)]" : "border-white/10 bg-black/20")}>
      <div className={cn("flex items-center gap-4", side === "right" && "xl:flex-row-reverse xl:text-right")}>
        <AvatarImage name={participant?.name || "Waiting"} src={participant?.profileImage || ""} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-black text-white">{participant?.name || "Waiting for opponent"}</p>
          <p className="mt-1 text-sm text-zinc-500">{participant?.ready ? "Ready" : "Not ready"}</p>
        </div>
      </div>
      <p className="mt-5 text-3xl font-black text-white">{formatBattlePoints(score)}</p>
      <div className="mt-4 h-4 overflow-hidden rounded-full bg-zinc-900">
        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function AvatarImage({ name, src }: { name: string; src?: string }) {
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-fuchsia-400 bg-zinc-900 text-lg font-black text-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <div className="mt-2 flex gap-2">
        <Input readOnly value={value} className="border-zinc-700 bg-zinc-950/70 text-white" />
        <Button type="button" variant="outline" onClick={() => void navigator.clipboard?.writeText(value)} className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Swords; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-white/10 p-3">
          <Icon className="h-5 w-5 text-fuchsia-200" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function RankingBlock({ title, items, currency = false }: { title: string; items: RankingItem[]; currency?: boolean }) {
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 3).map((item, index) => (
          <div key={`${title}-${item.creatorId}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-zinc-300">{index + 1}. {item.name}</span>
            <span className="font-bold text-fuchsia-200">{currency ? money(item.value) : item.value.toLocaleString()}</span>
          </div>
        )) : <p className="text-sm text-zinc-500">No ranking yet.</p>}
      </div>
    </div>
  )
}

function SettingTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 font-bold text-white">{value}</p>
    </div>
  )
}

function Notice({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", tone === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-red-500/20 bg-red-500/10 text-red-100")}>
      {children}
    </div>
  )
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">{children}</div>
}

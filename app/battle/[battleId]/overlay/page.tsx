"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { io } from "socket.io-client"
import { Crown, Flame, Swords } from "lucide-react"
import { DonationAlert } from "@/components/donation-alert"
import { getApiBaseUrl, getSocketUrl } from "@/lib/runtime-config"
import {
  formatBattlePoints,
  formatBattleTime,
  getBattleLeader,
  type BattleSnapshot,
} from "@/lib/battle"
import { cn } from "@/lib/utils"

type AlertState = {
  senderName: string
  amount: number
  comboCount: number
  visible: boolean
}

const alertGradient = {
  start: "#ec4899",
  middle: "#f97316",
  end: "#22d3ee",
}

export default function BattleOverlayPage() {
  const params = useParams<{ battleId: string }>()
  const battleId = String(params?.battleId || "").toUpperCase()
  const [battle, setBattle] = useState<BattleSnapshot | null>(null)
  const [newLeader, setNewLeader] = useState("")
  const [alert, setAlert] = useState<AlertState>({
    senderName: "",
    amount: 0,
    comboCount: 0,
    visible: false,
  })
  const alertTimerRef = useRef<number | null>(null)
  const leader = getBattleLeader(battle)
  const totalScore = useMemo(() => Math.max(1, (battle?.scores.left || 0) + (battle?.scores.right || 0)), [battle])

  useEffect(() => {
    if (!battleId) return
    void fetch(`${getApiBaseUrl()}/public/battle/${encodeURIComponent(battleId)}`)
      .then((response) => response.json())
      .then((payload) => setBattle(payload?.battle || null))
      .catch(() => setBattle(null))
  }, [battleId])

  useEffect(() => {
    if (!battleId) return
    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
      auth: { battleId },
    })

    const updateBattle = (nextBattle: BattleSnapshot) => setBattle(nextBattle)
    socket.emit("battle_subscribe", { battleId })
    socket.on("battle_updated", updateBattle)
    socket.on("battle_started", updateBattle)
    socket.on("battle_timer", (payload) => {
      setBattle((current) =>
        current && current.battleId === payload.battleId
          ? {
              ...current,
              remainingSeconds: Number(payload.remainingSeconds) || 0,
              mode: payload.mode || current.mode,
            }
          : current,
      )
    })
    socket.on("battle_score_updated", updateBattle)
    socket.on("battle_mode_changed", updateBattle)
    socket.on("battle_finished", updateBattle)
    socket.on("battle_new_leader", (payload) => {
      setNewLeader(payload.leader)
      window.setTimeout(() => setNewLeader(""), 1800)
    })
    socket.on("overlayAlert", (data) => {
      setAlert((current) => ({
        senderName: data.senderName || data.displayName || data.sender || "Anonymous",
        amount: Number(data.amount) || 0,
        comboCount: current.comboCount + 1,
        visible: true,
      }))
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
      alertTimerRef.current = window.setTimeout(() => {
        setAlert((current) => ({ ...current, visible: false }))
      }, 5200)
    })

    return () => {
      socket.disconnect()
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current)
    }
  }, [battleId])

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent text-white">
      <div className="absolute inset-x-0 top-4 z-20 flex justify-center">
        <div className="rounded-full border border-white/15 bg-black/55 px-6 py-3 text-center backdrop-blur-xl">
          <div className="flex items-center justify-center gap-3">
            {battle?.doublePoints?.active ? <Flame className="h-5 w-5 text-orange-300" /> : <Swords className="h-5 w-5 text-fuchsia-200" />}
            <span className="text-sm font-black uppercase tracking-[0.2em]">
              {battle?.doublePoints?.active ? "DOUBLE POINTS" : battle?.finalMinuteActive ? "FINAL MINUTE" : "LIVE BATTLE"}
            </span>
          </div>
          <p className="mt-1 text-4xl font-black tabular-nums">{formatBattleTime(battle?.remainingSeconds || 0)}</p>
        </div>
      </div>

      <section className="grid min-h-screen grid-cols-2 items-center gap-6 px-8 pt-24">
        <OverlaySide
          side="left"
          participant={battle?.participants.left || null}
          score={battle?.scores.left || 0}
          percent={((battle?.scores.left || 0) / totalScore) * 100}
          leading={leader === "left"}
          newLeader={newLeader === "left"}
        />
        <OverlaySide
          side="right"
          participant={battle?.participants.right || null}
          score={battle?.scores.right || 0}
          percent={((battle?.scores.right || 0) / totalScore) * 100}
          leading={leader === "right"}
          newLeader={newLeader === "right"}
        />
      </section>

      {battle?.status === "finished" ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <div className="rounded-[36px] border border-yellow-300/40 bg-zinc-950/90 px-10 py-8 text-center shadow-[0_0_60px_rgba(250,204,21,0.25)]">
            <Crown className="mx-auto h-12 w-12 text-yellow-300" />
            <p className="mt-4 text-sm uppercase tracking-[0.24em] text-yellow-100">Winner</p>
            <h1 className="mt-2 text-4xl font-black">
              {battle.result === "draw"
                ? "Draw"
                : battle.result === "left"
                  ? battle.participants.left?.name
                  : battle.participants.right?.name}
            </h1>
            <p className="mt-3 text-zinc-300">
              {formatBattlePoints(battle.scores.left)} - {formatBattlePoints(battle.scores.right)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
        <DonationAlert
          senderName={alert.senderName}
          amount={alert.amount}
          comboCount={alert.comboCount}
          isVisible={alert.visible}
          giftPack="tiktok"
          gradient={alertGradient}
        />
      </div>
    </main>
  )
}

function OverlaySide({
  side,
  participant,
  score,
  percent,
  leading,
  newLeader,
}: {
  side: "left" | "right"
  participant: BattleSnapshot["participants"]["left"]
  score: number
  percent: number
  leading: boolean
  newLeader: boolean
}) {
  return (
    <div
      className={cn(
        "relative rounded-[36px] border bg-black/50 p-6 backdrop-blur-xl transition-all duration-500",
        leading ? "border-fuchsia-300/60 shadow-[0_0_45px_rgba(236,72,153,0.35)]" : "border-white/15",
      )}
    >
      {newLeader ? (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-fuchsia-500 px-5 py-2 text-sm font-black uppercase tracking-[0.2em]">
          New Leader
        </div>
      ) : null}
      <div className={cn("flex items-center gap-5", side === "right" && "flex-row-reverse text-right")}>
        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-fuchsia-400 bg-zinc-900">
          {participant?.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={participant.profileImage} alt={participant.name} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-3xl font-black">{participant?.name || "Waiting"}</p>
          <p className="mt-2 text-5xl font-black tabular-nums text-fuchsia-100">{formatBattlePoints(score)}</p>
        </div>
      </div>
      <div className="mt-6 h-6 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 transition-all duration-700"
          style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  )
}

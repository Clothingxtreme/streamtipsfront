export type BattleStatus = "waiting" | "connected" | "countdown" | "active" | "finished" | "cancelled"

export type BattleParticipant = {
  userId: string
  name: string
  email?: string
  profileImage?: string
  ready?: boolean
  score: number
  amountRaised: number
}

export type BattleSnapshot = {
  battleId: string
  inviteLink: string
  overlayLink: string
  status: BattleStatus
  durationSeconds: number
  mode: "normal" | "double_points" | "final_minute" | "finished" | string
  startedAt?: string
  endsAt?: string
  finishedAt?: string
  remainingSeconds: number
  doublePoints?: {
    active: boolean
    endsAt?: string
    remainingSeconds: number
  }
  finalMinuteActive?: boolean
  scores: {
    left: number
    right: number
  }
  result?: "pending" | "left" | "right" | "draw"
  winnerId?: string
  stats?: {
    totalRaised?: number
    largestDonation?: number
    topSupporter?: string
    supporterCount?: number
    donationCount?: number
  }
  participants: {
    left: BattleParticipant | null
    right: BattleParticipant | null
  }
}

export function formatBattleTime(seconds: number) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remaining = safeSeconds % 60
  return `${minutes}:${String(remaining).padStart(2, "0")}`
}

export function formatBattlePoints(points: number) {
  return `${Math.round(Number(points) || 0).toLocaleString()} pts`
}

export function getBattleLeader(battle?: BattleSnapshot | null) {
  if (!battle) return "draw"
  if ((battle.scores.left || 0) === (battle.scores.right || 0)) return "draw"
  return (battle.scores.left || 0) > (battle.scores.right || 0) ? "left" : "right"
}

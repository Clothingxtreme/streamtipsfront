"use client"

import { motion } from "framer-motion"
import { Crown, Trophy } from "lucide-react"
import { DonorAvatar } from "@/components/donor-avatar"
import { sanitizeDonorDisplayName } from "@/lib/donor-display"
import { overlayLabelClass, overlayPanelClass } from "@/components/overlay-theme"
import { cn } from "@/lib/utils"

export interface Contributor {
  id: string
  name: string
  amount: number
}

interface LeaderboardProps {
  contributors: Contributor[]
  title?: string
  maxItems?: number
}

export function Leaderboard({
  contributors,
  title = "Gift Leaderboard",
  maxItems = 5,
}: LeaderboardProps) {
  const sortedContributors = [...contributors]
    .filter((contributor) => contributor.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, maxItems)

  return (
    <div className={cn(overlayPanelClass, "p-4")}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300">
          <Trophy className="h-4 w-4" />
        </div>
        <div>
          <p className={overlayLabelClass}>Top Gifters</p>
          <h2 className="text-base font-bold text-white">{title}</h2>
        </div>
      </div>

      <div className="space-y-2">
        {sortedContributors.length > 0 ? (
          sortedContributors.map((contributor, index) => {
            const displayName = sanitizeDonorDisplayName(contributor.name) || "Anonymous"
            const isChampion = index === 0

            return (
              <motion.div
                key={contributor.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 260, damping: 26 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                  isChampion ? "border-white/15 bg-white/[0.07]" : "border-white/[0.06] bg-white/[0.02]",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isChampion ? "bg-white text-black" : "bg-white/[0.06] text-zinc-300",
                  )}
                >
                  {isChampion ? <Crown className="h-4 w-4" aria-label="Top gifter" /> : index + 1}
                </div>
                <DonorAvatar name={displayName} className="h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-white", isChampion ? "text-base font-bold" : "text-sm font-semibold")}>
                    {displayName}
                  </p>
                  {isChampion ? <p className="text-xs text-zinc-400">Top gifter</p> : null}
                </div>
                <p className={cn("shrink-0 text-right font-bold tabular-nums", isChampion ? "text-sm text-white" : "text-xs text-zinc-300")}>
                  NGN {contributor.amount.toLocaleString()}
                </p>
              </motion.div>
            )
          })
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center text-sm text-zinc-400">
            Waiting for the first live gift...
          </div>
        )}
      </div>
    </div>
  )
}

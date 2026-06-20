"use client"

import { motion } from "framer-motion"
import { Crown, Sparkles, Trophy } from "lucide-react"
import { DonorAvatar } from "@/components/donor-avatar"
import { sanitizeDonorDisplayName } from "@/lib/donor-display"

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
    <div className="rounded-[28px] border border-white/14 bg-black/22 p-4 shadow-[0_0_40px_rgba(79,70,229,0.16)] backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/18 text-violet-100">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">
            Top Gifters
          </p>
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
      </div>

      <div className="space-y-3">
        {sortedContributors.length > 0 ? (
          sortedContributors.map((contributor, index) => {
            const displayName = sanitizeDonorDisplayName(contributor.name) || "Anonymous"
            const isChampion = index === 0

            return (
              <motion.div
                key={contributor.id}
                initial={{ opacity: 0, x: 24, scale: isChampion ? 0.96 : 1 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 24 }}
                className={
                  isChampion
                    ? "leaderboard-champion relative isolate overflow-hidden rounded-[26px] border border-amber-200/60 bg-gradient-to-br from-yellow-300/24 via-amber-400/16 to-fuchsia-400/16 px-4 py-4 shadow-[0_0_34px_rgba(251,191,36,0.36),inset_0_1px_0_rgba(255,255,255,0.24)]"
                    : "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-3 py-3"
                }
              >
                {isChampion ? (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.34),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(34,211,238,0.26),transparent_24%)]" />
                    <div className="leaderboard-champion-shine pointer-events-none absolute inset-y-[-30%] left-[-45%] w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                    <div className="relative flex items-center gap-3">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-yellow-100/75 bg-gradient-to-br from-yellow-200 via-amber-300 to-orange-500 text-amber-950 shadow-[0_0_24px_rgba(251,191,36,0.58)]">
                        <Crown className="h-7 w-7" />
                        <span className="absolute -bottom-1 rounded-full border border-amber-100/80 bg-black/65 px-2 py-0.5 text-[10px] font-black leading-none text-yellow-200">
                          #1
                        </span>
                      </div>
                      <DonorAvatar
                        name={displayName}
                        className="h-14 w-14 shrink-0 ring-2 ring-yellow-200/80 ring-offset-2 ring-offset-black/30"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-yellow-100/40 bg-black/28 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-100">
                          <Sparkles className="h-3 w-3" />
                          Top Supporter
                        </div>
                        <p className="truncate text-lg font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                          {displayName}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-100/75">
                          reigning champion
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-100/70">
                          Total
                        </p>
                        <p className="text-base font-black text-yellow-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">
                          NGN {contributor.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <DonorAvatar
                      name={displayName}
                      className="h-11 w-11 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {displayName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">gifter</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-cyan-200">
                        NGN {contributor.amount.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            )
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/6 p-5 text-center text-sm text-white/55">
            Waiting for the first live gift...
          </div>
        )}
      </div>
    </div>
  )
}

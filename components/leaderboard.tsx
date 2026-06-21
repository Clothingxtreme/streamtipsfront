"use client"

import { motion } from "framer-motion"
import { Crown, Sparkles, Star, Trophy } from "lucide-react"
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
                    ? "leaderboard-champion relative isolate overflow-hidden rounded-[30px] border-2 border-amber-200/80 bg-gradient-to-br from-yellow-200/34 via-amber-400/22 to-fuchsia-400/20 px-4 py-5 shadow-[0_0_46px_rgba(251,191,36,0.48),0_0_90px_rgba(217,70,239,0.18),inset_0_1px_0_rgba(255,255,255,0.35)]"
                    : "flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 px-3 py-2.5 opacity-80"
                }
              >
                {isChampion ? (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.42),transparent_26%),radial-gradient(circle_at_84%_18%,rgba(34,211,238,0.32),transparent_24%),linear-gradient(115deg,rgba(255,255,255,0.12),transparent_38%)]" />
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-yellow-100/30 bg-yellow-200/14 blur-sm" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-fuchsia-300/16 blur-xl" />
                    <div className="leaderboard-champion-shine pointer-events-none absolute inset-y-[-30%] left-[-45%] w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-100/60 bg-black/38 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.28)]">
                          <Sparkles className="h-3.5 w-3.5" />
                          Champion Spot
                        </div>
                        <div className="leaderboard-champion-rank flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-50 bg-gradient-to-br from-yellow-100 via-amber-300 to-orange-500 text-lg font-black text-amber-950 shadow-[0_0_28px_rgba(251,191,36,0.72)]">
                          #1
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div className="absolute -inset-2 rounded-full bg-yellow-200/40 blur-md" />
                          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-yellow-50 bg-gradient-to-br from-yellow-200 via-amber-300 to-orange-500 text-amber-950 shadow-[0_0_32px_rgba(251,191,36,0.7)]">
                            <Crown className="h-10 w-10" />
                          </div>
                        </div>
                        <DonorAvatar
                          name={displayName}
                          className="h-16 w-16 shrink-0 ring-4 ring-yellow-200/90 ring-offset-4 ring-offset-black/35"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-1.5 text-yellow-100">
                            <Star className="h-4 w-4 fill-yellow-200" />
                            <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                              Reigning Top Supporter
                            </span>
                          </div>
                          <p className="truncate text-2xl font-black text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.58)]">
                            {displayName}
                          </p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-yellow-100/75">
                            everyone is chasing this slot
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-yellow-100/35 bg-black/35 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-100/68">
                          Champion Total
                        </p>
                        <p className="mt-1 text-2xl font-black text-yellow-100 drop-shadow-[0_0_16px_rgba(250,204,21,0.62)]">
                          NGN {contributor.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-xs font-black text-white/70">
                      {index + 1}
                    </div>
                    <DonorAvatar
                      name={displayName}
                      className="h-10 w-10 shrink-0 opacity-85"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/82">
                        {displayName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/45">gifter</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-cyan-100/78">
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

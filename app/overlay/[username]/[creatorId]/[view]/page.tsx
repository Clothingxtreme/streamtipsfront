"use client"

import { useParams } from "next/navigation"
import Overlay from "@/components/overlay"

const overlayModes = ["full", "gifts", "goal", "leaderboard", "account"] as const
type OverlayMode = (typeof overlayModes)[number]

function normalizeOverlayMode(value: string): OverlayMode {
  if (value === "gift" || value === "animation" || value === "animations") {
    return "gifts"
  }

  if (value === "goal" || value === "donation-goal" || value === "donationgoal") {
    return "goal"
  }

  if (value === "donation" || value === "donations" || value === "account-details") {
    return "account"
  }

  return overlayModes.includes(value as OverlayMode) ? (value as OverlayMode) : "full"
}

export default function PublicCreatorOverlayViewPage() {
  const params = useParams<{ creatorId?: string; view?: string }>()
  const creatorId = typeof params.creatorId === "string" ? params.creatorId : ""
  const mode = normalizeOverlayMode(typeof params.view === "string" ? params.view : "full")

  return <Overlay publicCreatorId={creatorId} mode={mode} />
}

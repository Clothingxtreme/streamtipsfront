"use client"

import { useState } from "react"
import { ObsConnectCard } from "@/components/dashboard/obs-connect-card"
import { OverlaySceneEditor } from "@/components/dashboard/overlay-scene-editor"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { saveOverlayState } from "@/lib/overlay-state-client"
import { Button } from "@/components/ui/button"
import { Crown, ListOrdered, RotateCcw } from "lucide-react"

export default function OverlaySettingsPage() {
  const { customization, updateCustomization } = useOverlayCustomization()
  const [resetState, setResetState] = useState<"idle" | "saving" | "saved">("idle")

  const handleResetLeaderboard = async () => {
    setResetState("saving")

    try {
      await saveOverlayState({ leaderboardResetAt: new Date().toISOString() })
      setResetState("saved")
      window.setTimeout(() => {
        setResetState("idle")
      }, 2200)
    } catch {
      setResetState("idle")
    }
  }

  return (
    <div data-tour="overlay-settings-main" className="max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Overlay Settings</h1>
        <p className="text-zinc-500">
          Control alert animations, sounds, desktop notifications, and preview mode across your dashboard and overlay tabs.
        </p>
      </div>

      <section className="flex flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Stream Leaderboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Reset old supporters or choose whether the live overlay shows all top gifters or only the champion.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => updateCustomization("leaderboardDisplayMode", "top5")}
              className={
                customization.leaderboardDisplayMode === "top5"
                  ? "bg-zinc-800 text-white hover:bg-zinc-800"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }
            >
              <ListOrdered className="mr-2 h-4 w-4" />
              Top 5
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => updateCustomization("leaderboardDisplayMode", "champion")}
              className={
                customization.leaderboardDisplayMode === "champion"
                  ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }
            >
              <Crown className="mr-2 h-4 w-4" />
              #1 only
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleResetLeaderboard}
            disabled={resetState === "saving"}
            variant="outline"
            className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {resetState === "saving"
              ? "Resetting..."
              : resetState === "saved"
                ? "Leaderboard reset"
                : "Reset leaderboard"}
          </Button>
        </div>
      </section>
      <OverlaySceneEditor
        customization={customization}
        updateCustomization={updateCustomization}
      />
      <ObsConnectCard />
    </div>
  )
}

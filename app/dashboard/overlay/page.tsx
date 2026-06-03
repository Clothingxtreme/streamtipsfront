"use client"

import { useState } from "react"
import { ObsConnectCard } from "@/components/dashboard/obs-connect-card"
import { OverlaySceneEditor } from "@/components/dashboard/overlay-scene-editor"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { saveOverlayState } from "@/lib/overlay-state-client"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

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

      <section className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Stream Leaderboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Reset before a new stream so old supporters from the last stream do not appear.
          </p>
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
      </section>
      <OverlaySceneEditor
        customization={customization}
        updateCustomization={updateCustomization}
      />
      <ObsConnectCard />
    </div>
  )
}

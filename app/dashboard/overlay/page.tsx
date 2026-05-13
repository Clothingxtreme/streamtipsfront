"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimationToggle, defaultOverlaySettings } from "@/components/dashboard/animation-toggle"
import { ObsConnectCard } from "@/components/dashboard/obs-connect-card"
import { OverlaySceneEditor } from "@/components/dashboard/overlay-scene-editor"
import { OverlayShowcaseSettings } from "@/components/dashboard/overlay-showcase-settings"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { useOverlaySettings } from "@/app/context/OverlaySettingsContext"
import type { OverlaySettingId } from "@/lib/overlay-settings"
import { giftPackThemes } from "@/lib/gifts"
import { saveOverlayState } from "@/lib/overlay-state-client"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

export default function OverlaySettingsPage() {
  const { settings, updateSetting } = useOverlaySettings()
  const { customization, updateCustomization } = useOverlayCustomization()
  const [draftCustomization, setDraftCustomization] = useState(customization)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const [resetState, setResetState] = useState<"idle" | "saving" | "saved">("idle")

  useEffect(() => {
    setDraftCustomization(customization)
  }, [customization])

  const overlaySettings = defaultOverlaySettings.map((item) => ({
    ...item,
    enabled: settings[item.id],
  }))

  const handleToggle = async (id: OverlaySettingId, enabled: boolean) => {
    await updateSetting(id, enabled)
  }

  const customizationChanged = useMemo(
    () =>
      JSON.stringify(draftCustomization) !== JSON.stringify(customization),
    [customization, draftCustomization],
  )

  const handleSaveExperience = () => {
    setSaveState("saving")

    updateCustomization("giftPack", draftCustomization.giftPack)
    updateCustomization("goalTitle", draftCustomization.goalTitle.trim() || "Tonight's Gift Goal")
    updateCustomization("goalAmount", Math.max(1000, draftCustomization.goalAmount))

    setSaveState("saved")
    window.setTimeout(() => {
      setSaveState("idle")
    }, 2200)
  }

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
    <div className="max-w-7xl space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Overlay Settings</h1>
        <p className="text-zinc-500">
          Control alert animations, sounds, desktop notifications, and preview mode across your dashboard and overlay tabs.
        </p>
      </div>

      <AnimationToggle settings={overlaySettings} onToggle={handleToggle} />
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
      <OverlayShowcaseSettings
        customization={draftCustomization}
        giftPacks={giftPackThemes}
        onGiftPackChange={(giftPack) =>
          setDraftCustomization((current) => ({ ...current, giftPack }))
        }
        onGoalTitleChange={(title) =>
          setDraftCustomization((current) => ({ ...current, goalTitle: title }))
        }
        onGoalAmountChange={(amount) =>
          setDraftCustomization((current) => ({
            ...current,
            goalAmount: Number.isFinite(amount) ? Math.max(1000, amount) : 1000,
          }))
        }
        saveState={saveState}
        onSave={handleSaveExperience}
        disableSave={!customizationChanged}
      />
      <OverlaySceneEditor
        customization={customization}
        updateCustomization={updateCustomization}
      />
      <ObsConnectCard />
    </div>
  )
}

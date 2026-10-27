"use client"

import { Info, SlidersHorizontal } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import type { OverlayCustomization } from "@/lib/overlay-customization"

type FeatureToggleKey =
  | "showLeaderboard"
  | "showTopSupporter"
  | "showAmbientScene"
  | "showAccountDetails"

const featureToggles: Array<{
  key: FeatureToggleKey
  label: string
  description: string
}> = [
  {
    key: "showLeaderboard",
    label: "Show Leaderboard",
    description: "Display the top gifters panel live on stream.",
  },
  {
    key: "showTopSupporter",
    label: "Show Top Supporter Badge",
    description: "Show the leading gifter beside the goal area.",
  },
  {
    key: "showAmbientScene",
    label: "Ambient Stage Effects",
    description: "Keep soft background glows and motion even before alerts appear.",
  },
  {
    key: "showAccountDetails",
    label: "Show Account Details",
    description: "Display your virtual account details on stream when you want viewers to fund directly.",
  },
]

export function OverlayFeatureControls({
  customization,
  updateCustomization,
}: {
  customization: OverlayCustomization
  updateCustomization: <K extends keyof OverlayCustomization>(
    key: K,
    value: OverlayCustomization[K],
  ) => void
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
            Feature Toggles
          </div>
          <div className="mt-4 space-y-4">
            {featureToggles.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-sm text-zinc-500">{item.description}</p>
                </div>
                <Switch
                  checked={customization[item.key]}
                  onCheckedChange={(checked) => updateCustomization(item.key, checked)}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Info className="h-4 w-4 text-zinc-500" />
            Extra Notes
          </div>
          <div className="mt-4 space-y-3 text-sm text-zinc-400">
            <p>Feature toggles update the real overlay immediately, so streamers can fine-tune visible blocks while one OBS browser source stays connected.</p>
            <p>All overlays use one fixed dark theme so they stay readable on any stream.</p>
            <p>Use the Connect to OBS section for browser-source setup after copying your stream-ready URLs.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function OverlaySceneEditor(props: {
  customization: OverlayCustomization
  updateCustomization: <K extends keyof OverlayCustomization>(
    key: K,
    value: OverlayCustomization[K],
  ) => void
}) {
  return (
    <>
      <OverlayFeatureControls {...props} />
    </>
  )
}

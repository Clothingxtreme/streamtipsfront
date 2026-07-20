"use client"

import { Palette, SlidersHorizontal } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import type { OverlayCustomization, OverlayGradientConfig } from "@/lib/overlay-customization"

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

function GradientEditor({
  label,
  gradient,
  onChange,
}: {
  label: string
  gradient: OverlayGradientConfig
  onChange: (key: keyof OverlayGradientConfig, value: string) => void
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-sm font-semibold text-white">{label}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {(["start", "middle", "end"] as Array<keyof OverlayGradientConfig>).map((stop) => (
          <label key={stop} className="space-y-2">
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{stop}</span>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
              <input
                type="color"
                value={gradient[stop]}
                onChange={(event) => onChange(stop, event.target.value)}
                className="h-10 w-10 rounded border-none bg-transparent"
              />
              <Input
                value={gradient[stop]}
                onChange={(event) => onChange(stop, event.target.value)}
                className="border-none bg-transparent p-0 text-white shadow-none"
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
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
            <Palette className="h-4 w-4 text-zinc-500" />
            Extra Notes
          </div>
          <div className="mt-4 space-y-3 text-sm text-zinc-400">
            <p>Feature toggles update the real overlay immediately, so streamers can fine-tune visible blocks while one OBS browser source stays connected.</p>
            <p>Gradient controls accept direct color picker updates for the panels that remain configurable.</p>
            <p>Use the Connect to OBS section for browser-source setup after copying your stream-ready URLs.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function OverlayGradientControls({
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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
      <div className="mb-5">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Palette className="h-4 w-4 text-zinc-500" />
          Color Gradients
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          Customize the live overlay panels without changing your core StreamTips branding.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GradientEditor
          label="Leaderboard Gradient"
          gradient={customization.leaderboardGradient}
          onChange={(key, value) =>
            updateCustomization("leaderboardGradient", {
              ...customization.leaderboardGradient,
              [key]: value,
            })
          }
        />
        <GradientEditor
          label="Account Panel Gradient"
          gradient={customization.accountGradient}
          onChange={(key, value) =>
            updateCustomization("accountGradient", {
              ...customization.accountGradient,
              [key]: value,
            })
          }
        />
        <GradientEditor
          label="Gift Alert Gradient"
          gradient={customization.alertGradient}
          onChange={(key, value) =>
            updateCustomization("alertGradient", {
              ...customization.alertGradient,
              [key]: value,
            })
          }
        />
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
      <OverlayGradientControls {...props} />
    </>
  )
}

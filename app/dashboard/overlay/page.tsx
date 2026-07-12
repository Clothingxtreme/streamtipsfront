"use client"

import { useState } from "react"
import { ObsConnectCard } from "@/components/dashboard/obs-connect-card"
import { OverlaySceneEditor } from "@/components/dashboard/overlay-scene-editor"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { saveOverlayState } from "@/lib/overlay-state-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Flame, Gem, Joystick, Crown, ListOrdered, RotateCcw, Target } from "lucide-react"

function buildGoalGradient(color: string) {
  return {
    start: color,
    middle: "#011B33",
    end: color,
  }
}

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export default function OverlaySettingsPage() {
  const { customization, updateCustomization } = useOverlayCustomization()
  const [resetState, setResetState] = useState<"idle" | "saving" | "saved">("idle")
  const safeGoalColor = isValidHexColor(customization.goalColor)
    ? customization.goalColor
    : "#00C3F7"

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

  const comboStyles = [
    {
      id: "neon",
      label: "Neon",
      icon: Gem,
      className: "data-[selected=true]:bg-cyan-500 data-[selected=true]:text-cyan-950",
    },
    {
      id: "flame",
      label: "Flame",
      icon: Flame,
      className: "data-[selected=true]:bg-amber-400 data-[selected=true]:text-amber-950",
    },
    {
      id: "arcade",
      label: "Arcade",
      icon: Joystick,
      className: "data-[selected=true]:bg-fuchsia-500 data-[selected=true]:text-white",
    },
  ] as const

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

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-200">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Donation Combo</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Build hype when multiple donations arrive close together on the live overlay.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 xl:min-w-[260px]">
            <div>
              <p className="font-medium text-white">Enable Combo</p>
              <p className="text-sm text-zinc-500">Show animated combo streaks on donations.</p>
            </div>
            <Switch
              checked={customization.showDonationCombo}
              onCheckedChange={(checked) => updateCustomization("showDonationCombo", checked)}
              className="data-[state=checked]:bg-fuchsia-500"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Combo Duration (seconds)</label>
            <Input
              type="number"
              min={3}
              max={30}
              step={1}
              value={customization.comboDurationSeconds}
              onChange={(event) => {
                const duration = Number(event.target.value)
                updateCustomization(
                  "comboDurationSeconds",
                  Number.isFinite(duration) ? Math.max(3, Math.min(30, Math.round(duration))) : 10,
                )
              }}
              className="border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Combo Style</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {comboStyles.map((style) => {
                const Icon = style.icon
                const selected = customization.comboStyle === style.id

                return (
                  <Button
                    key={style.id}
                    type="button"
                    variant="ghost"
                    data-selected={selected}
                    onClick={() => updateCustomization("comboStyle", style.id)}
                    className={`justify-start border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 hover:text-white ${style.className}`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {style.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200">
                Combo Preview
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                Donation Combo x4
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 sm:w-56">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-amber-300" />
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            If another donation arrives before the timer ends, the count increases and the timer restarts.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-200">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Donation Goal</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Create a compact progress overlay for stream goals without covering the stream.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 xl:min-w-[260px]">
            <div>
              <p className="font-medium text-white">Enable Donation Goal</p>
              <p className="text-sm text-zinc-500">Controls the goal overlay visibility.</p>
            </div>
            <Switch
              checked={customization.showGoal}
              onCheckedChange={(checked) => updateCustomization("showGoal", checked)}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.75fr_0.55fr]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Goal Title</label>
            <Input
              value={customization.goalTitle}
              onChange={(event) => updateCustomization("goalTitle", event.target.value)}
              placeholder="Gaming Chair"
              className="border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Goal Amount (NGN)</label>
            <Input
              type="number"
              min={1000}
              step={500}
              value={customization.goalAmount}
              onChange={(event) => {
                const amount = Number(event.target.value)
                updateCustomization("goalAmount", Number.isFinite(amount) ? Math.max(1000, amount) : 1000)
              }}
              className="border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Goal Color</label>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2">
              <input
                type="color"
                value={safeGoalColor}
                onChange={(event) => {
                  updateCustomization("goalColor", event.target.value)
                  updateCustomization("goalGradient", buildGoalGradient(event.target.value))
                }}
                className="h-9 w-10 rounded border-none bg-transparent"
              />
              <Input
                value={customization.goalColor}
                onChange={(event) => {
                  updateCustomization("goalColor", event.target.value)
                  if (isValidHexColor(event.target.value)) {
                    updateCustomization("goalGradient", buildGoalGradient(event.target.value))
                  }
                }}
                className="border-none bg-transparent p-0 text-white shadow-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 max-w-3xl rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{customization.goalTitle || "Donation Goal"}</p>
              <p className="mt-1 text-xs text-zinc-400">
                NGN 0 / NGN {Number(customization.goalAmount || 0).toLocaleString()}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
              Preview
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-800">
            <div
              className="h-full w-1/3 rounded-full"
              style={{ background: safeGoalColor }}
            />
          </div>
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

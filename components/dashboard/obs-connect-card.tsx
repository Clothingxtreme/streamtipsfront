"use client"

import { Copy, MonitorPlay, RadioTower, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getOverlayUrl, type OverlayUrlMode } from "@/lib/runtime-config"
import { useAuth } from "@/app/context/AuthContext"

const steps = [
  "Open OBS and select the scene where you want StreamTip to appear.",
  "Under Sources, click the + button and choose Browser.",
  "Create separate browser sources for live donations, donation goal, leaderboard, or account details anywhere you want independent placement.",
  "Paste the matching overlay URL below into each Browser Source URL field.",
  "Set each source size to match the area you want to control, then keep the background transparent.",
  "Leave the sources active so live gifts, goals, leaderboard, and account details stay linked.",
]

const overlayLinks: Array<{
  mode: OverlayUrlMode
  title: string
  description: string
}> = [
  {
    mode: "gifts",
    title: "Live donation alerts",
    description: "Transparent until a donation alert appears. Best for your main live alert source.",
  },
  {
    mode: "goal",
    title: "Donation goal only",
    description: "Goal bar and top supporter badge without the leaderboard panel.",
  },
  {
    mode: "leaderboard",
    title: "Leaderboard only",
    description: "Top gifters panel without the donation goal block.",
  },
  {
    mode: "account",
    title: "Donation account only",
    description: "Virtual account name, number, bank, and provider.",
  },
]

export function ObsConnectCard() {
  const { user } = useAuth()

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/80">
      <div className="border-b border-zinc-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
            <MonitorPlay className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Connect to OBS</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Exact browser-source setup for your live overlay.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3">
          {overlayLinks.map((link) => {
            const overlayUrl = getOverlayUrl(user, link.mode)

            return (
              <div key={link.mode} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-white">{link.title}</p>
                  <p className="text-xs text-zinc-500">{link.description}</p>
                </div>
                <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                  <Input
                    readOnly
                    value={overlayUrl}
                    className="border-zinc-700 bg-zinc-900 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                    onClick={() => {
                      void navigator.clipboard.writeText(overlayUrl)
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy URL
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-3">
          {steps.map((step, index) => (
            <div
              key={step}
              className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                {index + 1}
              </div>
              <p className="pt-1 text-sm leading-6 text-zinc-300">{step}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Video className="h-4 w-4 text-cyan-300" />
              Recommended OBS size
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Use `1920 x 1080` for full HD scenes. Match your canvas size if you stream at another resolution.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <RadioTower className="h-4 w-4 text-emerald-300" />
              Same-machine note
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Use this unique URL in TikTok Studio, OBS, or any browser source so it always loads your creator account.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import { Copy, MonitorPlay, RadioTower, Video } from "lucide-react"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getOverlayUrl, type OverlayUrlMode } from "@/lib/runtime-config"

const steps = [
  "Open OBS and select the scene where you want StreamTip to appear.",
  "Under Sources, click the + button and choose Browser.",
  "Create separate browser sources for live donations, leaderboard, or account details anywhere you want independent placement.",
  "Paste the matching overlay URL below into each Browser Source URL field.",
  "Set each source size to match the area you want to control, then keep the background transparent.",
  "Leave the sources active so live gifts, leaderboard, and account details stay linked.",
]

const overlayLinks: Array<{
  mode: OverlayUrlMode
  label: string
  description: string
}> = [
  {
    mode: "gifts",
    label: "Live Donation Animation",
    description: "Transparent until a donation alert appears.",
  },
  {
    mode: "leaderboard",
    label: "Leaderboard",
    description: "Top gifters panel without the donation goal block.",
  },
  {
    mode: "account",
    label: "Donation Account",
    description: "Virtual account details for viewers.",
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

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-sm font-semibold text-white">Overlay URLs</p>
          <p className="mt-1 text-xs text-zinc-500">
            Copy the exact browser-source URL you want to add to OBS or TikTok Studio.
          </p>
          <div className="mt-4 grid gap-4">
            {overlayLinks.map((link) => {
              const overlayUrl = getOverlayUrl(user, link.mode)

              return (
                <div key={link.mode} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-white">{link.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">{link.description}</p>
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <Input
                      readOnly
                      value={overlayUrl}
                      className="border-zinc-700 bg-zinc-950 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                      onClick={() => {
                        void navigator.clipboard.writeText(overlayUrl)
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy URL
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
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

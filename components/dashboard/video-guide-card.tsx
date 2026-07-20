"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Clock3, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type VideoGuide = {
  title: string
  description: string
  duration: string
  youtubeUrl: string
}

function getYoutubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")
    const videoId =
      host === "youtu.be"
        ? parsed.pathname.replace("/", "")
        : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop() || ""

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url
  } catch {
    return url
  }
}

export function VideoGuideModal({
  guide,
  children,
}: {
  guide: VideoGuide
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const embedUrl = useMemo(() => getYoutubeEmbedUrl(guide.youtubeUrl), [guide.youtubeUrl])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-zinc-800 bg-zinc-950 p-0 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] sm:max-w-4xl">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="pr-8">
            <DialogTitle className="text-xl font-black text-white">{guide.title}</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-zinc-400">
              {guide.description}
            </DialogDescription>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
            {open ? (
              <iframe
                title={guide.title}
                src={`${embedUrl}?autoplay=1&rel=0`}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function VideoGuideCard({
  guide,
  className,
  compact = false,
}: {
  guide: VideoGuide
  className?: string
  compact?: boolean
}) {
  return (
    <VideoGuideModal
      guide={guide}
    >
      <button
        type="button"
        className={cn(
          "group flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition-all hover:border-fuchsia-400/35 hover:bg-zinc-900",
          compact ? "p-3" : "p-4",
          className,
        )}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[0_0_28px_rgba(236,72,153,0.22)]">
          <Play className="h-5 w-5 fill-current" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-white">{guide.title}</span>
          <span className="mt-1 line-clamp-2 block text-sm leading-5 text-zinc-400">{guide.description}</span>
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
            <Clock3 className="h-3.5 w-3.5" />
            {guide.duration}
          </span>
        </span>
      </button>
    </VideoGuideModal>
  )
}

export function VideoGuideButton({
  guide,
  className,
  children,
}: {
  guide: VideoGuide
  className?: string
  children?: ReactNode
}) {
  return (
    <VideoGuideModal guide={guide}>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-[52px] rounded-full border-white/14 bg-white/[0.055] px-7 text-base font-bold text-white backdrop-blur-xl hover:bg-white/10",
          className,
        )}
      >
        <Play className="h-4 w-4 fill-current" />
        {children || "Watch Video"}
      </Button>
    </VideoGuideModal>
  )
}

export function VideoGuideLibraryButton({
  guides,
  children,
}: {
  guides: VideoGuide[]
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [selectedGuide, setSelectedGuide] = useState<VideoGuide>(guides[0])
  const embedUrl = useMemo(
    () => getYoutubeEmbedUrl(selectedGuide?.youtubeUrl || ""),
    [selectedGuide?.youtubeUrl],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-zinc-800 bg-zinc-950 p-0 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] sm:max-w-5xl">
        <div className="grid gap-0 overflow-hidden rounded-lg lg:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-zinc-800 bg-zinc-900/70 p-4 lg:border-b-0 lg:border-r">
            <DialogTitle className="text-xl font-black text-white">StreamTips Tutorials</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-zinc-400">
              Watch the short setup and growth videos whenever you need a quick guide.
            </DialogDescription>
            <div className="mt-5 space-y-3">
              {guides.map((guide) => {
                const selected = guide.youtubeUrl === selectedGuide?.youtubeUrl

                return (
                  <button
                    key={guide.youtubeUrl}
                    type="button"
                    onClick={() => setSelectedGuide(guide)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-cyan-400/35 bg-cyan-400/10"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-fuchsia-400/35 hover:bg-zinc-900",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold text-white">{guide.title}</span>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-200">
                        <Clock3 className="h-3.5 w-3.5" />
                        {guide.duration}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="bg-black p-4">
            <div className="mb-4 pr-8">
              <h3 className="text-lg font-black text-white">{selectedGuide?.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">{selectedGuide?.description}</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
              {open ? (
                <iframe
                  title={selectedGuide?.title || "StreamTips tutorial"}
                  src={`${embedUrl}?rel=0`}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

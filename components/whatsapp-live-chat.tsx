"use client"

import { useMemo, useState } from "react"
import { MessageCircleMore, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getWhatsAppLiveChatUrl } from "@/lib/runtime-config"

const hiddenPathPrefixes = ["/admin", "/dashboard", "/overlay"]

export function WhatsAppLiveChat() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const chatUrl = useMemo(() => getWhatsAppLiveChatUrl(), [])
  const shouldHide =
    !chatUrl || hiddenPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (shouldHide) {
    return null
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-3">
      {isOpen ? (
        <div className="w-[340px] max-w-full overflow-hidden rounded-[28px] border border-emerald-400/20 bg-zinc-950/96 text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.2),transparent_55%),linear-gradient(135deg,rgba(16,185,129,0.24),rgba(2,132,199,0.18))] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/75">
                  Live Chat
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Chat with us on WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/12 bg-black/20 p-2 text-white/80 transition-colors hover:text-white"
                aria-label="Close live chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Tap below to begin a WhatsApp conversation with StreamTip support.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">Fastest reply path</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Your message opens directly in WhatsApp so replies stay simple and familiar.
              </p>
            </div>

            <Button
              asChild
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90"
            >
              <a href={chatUrl} target="_blank" rel="noreferrer">
                Begin Live Chat
              </a>
            </Button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "group inline-flex items-center gap-3 rounded-full border border-emerald-400/20 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(16,185,129,0.35)] transition-transform hover:-translate-y-0.5",
          isOpen ? "pr-3" : "",
        )}
        aria-expanded={isOpen}
        aria-label="Open WhatsApp live chat"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/15">
          <MessageCircleMore className="h-5 w-5" />
        </span>
        <span className="hidden sm:inline">{isOpen ? "Hide chat" : "Live Chat"}</span>
      </button>
    </div>
  )
}

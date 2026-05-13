"use client"

import { CircleHelp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function HelpTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
          aria-label="Why this is required"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-xs bg-zinc-100 text-zinc-900">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

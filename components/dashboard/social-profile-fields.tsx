"use client"

import type { ElementType, ReactNode } from "react"
import { AtSign, Link2, RadioTower } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AppUser } from "@/lib/user"

/** Platforms already supported by the social profile form (unchanged list). */
export const SOCIAL_PLATFORMS = ["tiktok", "instagram", "youtube", "x", "twitch", "facebook", "other"] as const

export type SocialProfileDraft = {
  platform: string
  handle: string
  profileUrl: string
  liveUrl: string
}

export function formatSocialPlatform(platform: string) {
  if (!platform) return ""
  return platform === "x" ? "X / Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1)
}

export function getSocialProfileDraft(user: Partial<AppUser> | null | undefined): SocialProfileDraft {
  return {
    platform: user?.socialProfile?.platform || "",
    handle: user?.socialProfile?.handle || "",
    profileUrl: user?.socialProfile?.profileUrl || "",
    liveUrl: user?.socialProfile?.liveUrl || "",
  }
}

/** Same "has socials" rule the dashboard readiness check and the old prompt used. */
export function hasSocialProfile(user: Partial<AppUser> | null | undefined) {
  const socialProfile = user?.socialProfile
  return Boolean(socialProfile?.handle || socialProfile?.profileUrl || socialProfile?.liveUrl)
}

export function SocialProfileFields({
  idPrefix,
  value,
  onChange,
  disabled,
}: {
  idPrefix: string
  value: SocialProfileDraft
  onChange: (next: SocialProfileDraft) => void
  disabled?: boolean
}) {
  const update = (key: keyof SocialProfileDraft, nextValue: string) => onChange({ ...value, [key]: nextValue })
  const inputClass = "border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SocialField id={`${idPrefix}-platform`} label="Main platform" icon={RadioTower}>
        <Select
          value={value.platform || "tiktok"}
          onValueChange={(platform) => update("platform", platform)}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-platform`} className="w-full border-zinc-700 bg-zinc-950/70 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900">
            {SOCIAL_PLATFORMS.map((platform) => (
              <SelectItem key={platform} value={platform} className="text-white focus:bg-zinc-800 focus:text-white">
                {formatSocialPlatform(platform)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SocialField>
      <SocialField id={`${idPrefix}-handle`} label="Handle" icon={AtSign}>
        <Input
          id={`${idPrefix}-handle`}
          value={value.handle}
          onChange={(event) => update("handle", event.target.value.replace(/^@+/, ""))}
          placeholder="creatorhandle"
          disabled={disabled}
          className={inputClass}
        />
      </SocialField>
      <SocialField id={`${idPrefix}-profile-url`} label="Profile link" icon={Link2}>
        <Input
          id={`${idPrefix}-profile-url`}
          value={value.profileUrl}
          onChange={(event) => update("profileUrl", event.target.value)}
          placeholder="https://www.tiktok.com/@creatorhandle"
          inputMode="url"
          disabled={disabled}
          className={inputClass}
        />
      </SocialField>
      <SocialField id={`${idPrefix}-live-url`} label="Live link (optional)" icon={RadioTower}>
        <Input
          id={`${idPrefix}-live-url`}
          value={value.liveUrl}
          onChange={(event) => update("liveUrl", event.target.value)}
          placeholder="Optional direct live URL"
          inputMode="url"
          disabled={disabled}
          className={inputClass}
        />
      </SocialField>
    </div>
  )
}

function SocialField({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string
  label: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-zinc-300">
        <Icon className="h-4 w-4 text-zinc-500" />
        {label}
      </label>
      {children}
    </div>
  )
}

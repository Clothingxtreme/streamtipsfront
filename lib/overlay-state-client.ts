import { authRequest } from "@/lib/auth-client"
import { getApiBaseUrl } from "@/lib/runtime-config"
import {
  defaultOverlayCustomization,
  sanitizeOverlayCustomization,
  type OverlayCustomization,
} from "@/lib/overlay-customization"
import {
  defaultOverlaySettingsMap,
  sanitizeOverlaySettings,
  type OverlaySettings,
} from "@/lib/overlay-settings"
import { defaultCustomGifts, sanitizeCustomGifts, type CustomGiftDefinition } from "@/lib/custom-gifts"
import type { AppUser } from "@/lib/user"

export type OverlayStatePayload = {
  settings: OverlaySettings
  customization: OverlayCustomization
  customGifts: CustomGiftDefinition[]
  leaderboardResetAt: string
}

export type PublicOverlayStatePayload = OverlayStatePayload & {
  user: AppUser
  donations: Array<{
    _id: string
    creatorId?: string
    amount: number
    sender?: string
    senderName?: string
    senderNameSource?: string
    walletStatus?: string
    status?: string
    date?: string
    createdAt?: string
  }>
}

export const defaultOverlayStatePayload: OverlayStatePayload = {
  settings: defaultOverlaySettingsMap,
  customization: defaultOverlayCustomization,
  customGifts: defaultCustomGifts,
  leaderboardResetAt: "",
}

export function sanitizeOverlayStatePayload(value: unknown): OverlayStatePayload {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return {
    settings: sanitizeOverlaySettings(candidate.settings),
    customization: sanitizeOverlayCustomization(candidate.customization),
    customGifts: sanitizeCustomGifts(candidate.customGifts),
    leaderboardResetAt:
      typeof candidate.leaderboardResetAt === "string" ? candidate.leaderboardResetAt : "",
  }
}

export async function fetchOverlayState() {
  const response = await authRequest("/overlay-state")

  if (!response.ok) {
    throw new Error("Could not load overlay state.")
  }

  return sanitizeOverlayStatePayload(await response.json())
}

export async function saveOverlayState(state: Partial<OverlayStatePayload>) {
  const response = await authRequest("/overlay-state", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
  })

  if (!response.ok) {
    throw new Error("Could not save overlay state.")
  }

  return sanitizeOverlayStatePayload(await response.json())
}

export async function fetchPublicOverlayState(creatorId: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/public/overlay/${encodeURIComponent(creatorId)}`,
    {
      cache: "no-store",
    },
  )

  if (!response.ok) {
    throw new Error("Could not load public overlay.")
  }

  const data = await response.json()
  const state = sanitizeOverlayStatePayload(data)

  return {
    ...state,
    user: data.user as AppUser,
    donations: Array.isArray(data.donations) ? data.donations : [],
  } satisfies PublicOverlayStatePayload
}

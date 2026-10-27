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

export type ManualLeaderboardEntry = {
  id: string
  name: string
  amount: number
  message?: string
  createdAt?: string
}

export type OverlayStatePayload = {
  settings: OverlaySettings
  customization: OverlayCustomization
  customGifts: CustomGiftDefinition[]
  manualLeaderboardEntries: ManualLeaderboardEntry[]
  leaderboardResetAt: string
  /** Read-only here: only changed through resetOverlayDonationTotal(). */
  donationTotalResetAt?: string
}

/** Running total shown by the "Donation Total" overlay, computed server-side. */
export type OverlayDonationTotal = {
  amount: number
  count: number
  currency: string
  showSubtitle: boolean
  resetAt: string
  computedAt: string
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
    provider?: string
    fundsFlow?: string
    paymentStatus?: string
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
  manualLeaderboardEntries: [],
  leaderboardResetAt: "",
  donationTotalResetAt: "",
}

function sanitizeManualLeaderboardEntries(value: unknown): ManualLeaderboardEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry): ManualLeaderboardEntry | null => {
      const candidate = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}
      const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
      const name = typeof candidate.name === "string" ? candidate.name.trim() : ""
      const amount = Number(candidate.amount)
      const message = typeof candidate.message === "string" ? candidate.message : ""
      const createdAt = typeof candidate.createdAt === "string" ? candidate.createdAt : ""

      if (!name || !Number.isFinite(amount) || amount <= 0) {
        return null
      }

      return {
        id: id || `${name}-${createdAt || amount}`,
        name,
        amount,
        message,
        createdAt,
      }
    })
    .filter((entry): entry is ManualLeaderboardEntry => Boolean(entry))
}

export function sanitizeOverlayStatePayload(value: unknown): OverlayStatePayload {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return {
    settings: sanitizeOverlaySettings(candidate.settings),
    customization: sanitizeOverlayCustomization(candidate.customization),
    customGifts: sanitizeCustomGifts(candidate.customGifts),
    manualLeaderboardEntries: sanitizeManualLeaderboardEntries(candidate.manualLeaderboardEntries),
    leaderboardResetAt:
      typeof candidate.leaderboardResetAt === "string" ? candidate.leaderboardResetAt : "",
    donationTotalResetAt:
      typeof candidate.donationTotalResetAt === "string" ? candidate.donationTotalResetAt : "",
  }
}

export function sanitizeOverlayDonationTotal(value: unknown): OverlayDonationTotal | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const candidate = value as Record<string, unknown>
  const amount = Number(candidate.amount)

  if (!Number.isFinite(amount) || amount < 0) {
    return null
  }

  const count = Number(candidate.count)

  return {
    amount,
    count: Number.isFinite(count) && count > 0 ? Math.round(count) : 0,
    currency: typeof candidate.currency === "string" && candidate.currency ? candidate.currency : "NGN",
    showSubtitle: candidate.showSubtitle !== false,
    resetAt: typeof candidate.resetAt === "string" ? candidate.resetAt : "",
    computedAt: typeof candidate.computedAt === "string" ? candidate.computedAt : "",
  }
}

export async function fetchPublicDonationTotal(creatorId: string, signal?: AbortSignal) {
  const response = await fetch(
    `${getApiBaseUrl()}/public/overlay/${encodeURIComponent(creatorId)}/donation-total`,
    {
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
      },
    },
  )

  if (response.status === 404) {
    throw new Error("not_found")
  }

  if (!response.ok) {
    throw new Error("Could not load the donation total.")
  }

  const total = sanitizeOverlayDonationTotal(await response.json())

  if (!total) {
    throw new Error("Could not read the donation total.")
  }

  return total
}

export async function resetOverlayDonationTotal() {
  const response = await authRequest("/overlay-state/donation-total/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
  })

  if (!response.ok) {
    throw new Error("Could not reset the donation total.")
  }

  const total = sanitizeOverlayDonationTotal(await response.json())

  if (!total) {
    throw new Error("Could not read the donation total.")
  }

  return total
}

let overlayStateInFlight: Promise<OverlayStatePayload> | null = null

// The settings, customization and custom-gift contexts all load this on mount; concurrent
// callers share one request instead of sending three identical ones.
export function fetchOverlayState() {
  if (!overlayStateInFlight) {
    overlayStateInFlight = (async () => {
      const response = await authRequest("/overlay-state")

      if (!response.ok) {
        throw new Error("Could not load overlay state.")
      }

      return sanitizeOverlayStatePayload(await response.json())
    })().finally(() => {
      overlayStateInFlight = null
    })
  }

  return overlayStateInFlight
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
      cache: "default",
      headers: {
        Accept: "application/json",
      },
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

export type GiftPackId = "tiktok" | "cosmic" | "luxury"
export type StreamPlatformId = "tiktok" | "twitch" | "youtube" | "kick"
export type LeaderboardDisplayMode = "top5" | "champion"
export type ComboStyleId = "neon" | "flame" | "arcade"
export type OverlayAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

export interface PositionedOverlayObject {
  anchor: OverlayAnchor
  offsetX: number
  offsetY: number
}

export interface OverlayGradientConfig {
  start: string
  middle: string
  end: string
}

export interface OverlayCustomization {
  giftPack: GiftPackId
  goalAmount: number
  goalTitle: string
  goalColor: string
  previewPlatform: StreamPlatformId
  goalOpacity: number
  leaderboardOpacity: number
  accountOpacity: number
  showLeaderboard: boolean
  leaderboardDisplayMode: LeaderboardDisplayMode
  showGoal: boolean
  showAccountDetails: boolean
  showTopSupporter: boolean
  showAmbientScene: boolean
  showDonationCombo: boolean
  comboDurationSeconds: number
  comboStyle: ComboStyleId
  alertPosition: PositionedOverlayObject
  goalPosition: PositionedOverlayObject
  leaderboardPosition: PositionedOverlayObject
  accountPosition: PositionedOverlayObject
  goalGradient: OverlayGradientConfig
  leaderboardGradient: OverlayGradientConfig
  accountGradient: OverlayGradientConfig
  alertGradient: OverlayGradientConfig
}

export const OVERLAY_CUSTOMIZATION_STORAGE_KEY = "streamtip.overlay.customization"

const legacyDefaultOverlayGradients = {
  goalGradient: {
    start: "#22d3ee",
    middle: "#8b5cf6",
    end: "#ec4899",
  },
  leaderboardGradient: {
    start: "#818cf8",
    middle: "#22d3ee",
    end: "#f472b6",
  },
  accountGradient: {
    start: "#1d4ed8",
    middle: "#0f766e",
    end: "#22c55e",
  },
  alertGradient: {
    start: "#f472b6",
    middle: "#8b5cf6",
    end: "#38bdf8",
  },
} satisfies Record<string, OverlayGradientConfig>

export const paystackOverlayGradients = {
  goalGradient: {
    start: "#011B33",
    middle: "#00C3F7",
    end: "#3BB75E",
  },
  leaderboardGradient: {
    start: "#011B33",
    middle: "#00AEEF",
    end: "#F5A623",
  },
  accountGradient: {
    start: "#011B33",
    middle: "#00C3F7",
    end: "#0B3558",
  },
  alertGradient: {
    start: "#00C3F7",
    middle: "#011B33",
    end: "#3BB75E",
  },
} satisfies Record<string, OverlayGradientConfig>

export const defaultOverlayCustomization: OverlayCustomization = {
  giftPack: "tiktok",
  goalAmount: 250000,
  goalTitle: "Tonight's Gift Goal",
  goalColor: "#00C3F7",
  previewPlatform: "tiktok",
  goalOpacity: 0.92,
  leaderboardOpacity: 0.88,
  accountOpacity: 0.9,
  showLeaderboard: true,
  leaderboardDisplayMode: "top5",
  showGoal: true,
  showAccountDetails: true,
  showTopSupporter: true,
  showAmbientScene: true,
  showDonationCombo: true,
  comboDurationSeconds: 10,
  comboStyle: "neon",
  alertPosition: {
    anchor: "center",
    offsetX: 0,
    offsetY: 12,
  },
  goalPosition: {
    anchor: "top-center",
    offsetX: 0,
    offsetY: 0,
  },
  leaderboardPosition: {
    anchor: "top-right",
    offsetX: 0,
    offsetY: 0,
  },
  accountPosition: {
    anchor: "bottom-left",
    offsetX: 0,
    offsetY: 0,
  },
  goalGradient: paystackOverlayGradients.goalGradient,
  leaderboardGradient: paystackOverlayGradients.leaderboardGradient,
  accountGradient: paystackOverlayGradients.accountGradient,
  alertGradient: paystackOverlayGradients.alertGradient,
}

function sanitizeAnchor(value: unknown, fallback: OverlayAnchor): OverlayAnchor {
  const anchors: OverlayAnchor[] = [
    "top-left",
    "top-center",
    "top-right",
    "center",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]

  return anchors.includes(value as OverlayAnchor) ? (value as OverlayAnchor) : fallback
}

function sanitizeOffset(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(-240, Math.min(240, Math.round(value)))
    : fallback
}

function sanitizePosition(
  value: unknown,
  fallback: PositionedOverlayObject,
): PositionedOverlayObject {
  if (!value || typeof value !== "object") {
    return fallback
  }

  const candidate = value as Partial<Record<keyof PositionedOverlayObject, unknown>>

  return {
    anchor: sanitizeAnchor(candidate.anchor, fallback.anchor),
    offsetX: sanitizeOffset(candidate.offsetX, fallback.offsetX),
    offsetY: sanitizeOffset(candidate.offsetY, fallback.offsetY),
  }
}

function sanitizeHex(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback
}

function gradientsMatch(left: OverlayGradientConfig, right: OverlayGradientConfig) {
  return (
    left.start.toLowerCase() === right.start.toLowerCase() &&
    left.middle.toLowerCase() === right.middle.toLowerCase() &&
    left.end.toLowerCase() === right.end.toLowerCase()
  )
}

function sanitizeGradient(
  value: unknown,
  fallback: OverlayGradientConfig,
  legacyFallback?: OverlayGradientConfig,
): OverlayGradientConfig {
  if (!value || typeof value !== "object") {
    return fallback
  }

  const candidate = value as Partial<Record<keyof OverlayGradientConfig, unknown>>

  const sanitized = {
    start: sanitizeHex(candidate.start, fallback.start),
    middle: sanitizeHex(candidate.middle, fallback.middle),
    end: sanitizeHex(candidate.end, fallback.end),
  }

  return legacyFallback && gradientsMatch(sanitized, legacyFallback) ? fallback : sanitized
}

function sanitizeOpacity(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0.15, Math.min(1, Number(value.toFixed(2))))
    : fallback
}

function sanitizeComboDuration(value: unknown) {
  const duration = Number(value)

  return Number.isFinite(duration)
    ? Math.max(3, Math.min(30, Math.round(duration)))
    : defaultOverlayCustomization.comboDurationSeconds
}

function sanitizeColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim()
    : fallback
}

export function sanitizeOverlayCustomization(value: unknown): OverlayCustomization {
  if (!value || typeof value !== "object") {
    return defaultOverlayCustomization
  }

  const candidate = value as Partial<Record<keyof OverlayCustomization, unknown>>
  const giftPack =
    candidate.giftPack === "tiktok" ||
    candidate.giftPack === "cosmic" ||
    candidate.giftPack === "luxury"
      ? candidate.giftPack
      : defaultOverlayCustomization.giftPack

  const previewPlatform =
    candidate.previewPlatform === "tiktok" ||
    candidate.previewPlatform === "twitch" ||
    candidate.previewPlatform === "youtube" ||
    candidate.previewPlatform === "kick"
      ? candidate.previewPlatform
      : defaultOverlayCustomization.previewPlatform
  const comboStyle =
    candidate.comboStyle === "neon" ||
    candidate.comboStyle === "flame" ||
    candidate.comboStyle === "arcade"
      ? candidate.comboStyle
      : defaultOverlayCustomization.comboStyle

  const goalAmount =
    typeof candidate.goalAmount === "number" && Number.isFinite(candidate.goalAmount)
      ? Math.max(1000, Math.round(candidate.goalAmount))
      : defaultOverlayCustomization.goalAmount

  const goalTitle =
    typeof candidate.goalTitle === "string" && candidate.goalTitle.trim()
      ? candidate.goalTitle.trim()
      : defaultOverlayCustomization.goalTitle

  return {
    giftPack,
    goalAmount,
    goalTitle,
    goalColor: sanitizeColor(candidate.goalColor, defaultOverlayCustomization.goalColor),
    previewPlatform,
    goalOpacity: sanitizeOpacity(candidate.goalOpacity, defaultOverlayCustomization.goalOpacity),
    leaderboardOpacity: sanitizeOpacity(
      candidate.leaderboardOpacity,
      defaultOverlayCustomization.leaderboardOpacity,
    ),
    accountOpacity: sanitizeOpacity(
      candidate.accountOpacity,
      defaultOverlayCustomization.accountOpacity,
    ),
    showLeaderboard:
      typeof candidate.showLeaderboard === "boolean"
        ? candidate.showLeaderboard
        : defaultOverlayCustomization.showLeaderboard,
    leaderboardDisplayMode:
      candidate.leaderboardDisplayMode === "champion" ||
      candidate.leaderboardDisplayMode === "top5"
        ? candidate.leaderboardDisplayMode
        : defaultOverlayCustomization.leaderboardDisplayMode,
    showGoal:
      typeof candidate.showGoal === "boolean"
        ? candidate.showGoal
        : defaultOverlayCustomization.showGoal,
    showAccountDetails:
      typeof candidate.showAccountDetails === "boolean"
        ? candidate.showAccountDetails
        : defaultOverlayCustomization.showAccountDetails,
    showTopSupporter:
      typeof candidate.showTopSupporter === "boolean"
        ? candidate.showTopSupporter
        : defaultOverlayCustomization.showTopSupporter,
    showAmbientScene:
      typeof candidate.showAmbientScene === "boolean"
        ? candidate.showAmbientScene
        : defaultOverlayCustomization.showAmbientScene,
    showDonationCombo:
      typeof candidate.showDonationCombo === "boolean"
        ? candidate.showDonationCombo
        : defaultOverlayCustomization.showDonationCombo,
    comboDurationSeconds: sanitizeComboDuration(candidate.comboDurationSeconds),
    comboStyle,
    alertPosition: sanitizePosition(
      candidate.alertPosition,
      defaultOverlayCustomization.alertPosition,
    ),
    goalPosition: sanitizePosition(candidate.goalPosition, defaultOverlayCustomization.goalPosition),
    leaderboardPosition: sanitizePosition(
      candidate.leaderboardPosition,
      defaultOverlayCustomization.leaderboardPosition,
    ),
    accountPosition: sanitizePosition(
      candidate.accountPosition,
      defaultOverlayCustomization.accountPosition,
    ),
    goalGradient: sanitizeGradient(
      candidate.goalGradient,
      defaultOverlayCustomization.goalGradient,
      legacyDefaultOverlayGradients.goalGradient,
    ),
    leaderboardGradient: sanitizeGradient(
      candidate.leaderboardGradient,
      defaultOverlayCustomization.leaderboardGradient,
      legacyDefaultOverlayGradients.leaderboardGradient,
    ),
    accountGradient: sanitizeGradient(
      candidate.accountGradient,
      defaultOverlayCustomization.accountGradient,
      legacyDefaultOverlayGradients.accountGradient,
    ),
    alertGradient: sanitizeGradient(
      candidate.alertGradient,
      defaultOverlayCustomization.alertGradient,
      legacyDefaultOverlayGradients.alertGradient,
    ),
  }
}

export function readStoredOverlayCustomization(): OverlayCustomization {
  if (typeof window === "undefined") {
    return defaultOverlayCustomization
  }

  try {
    const raw = window.localStorage.getItem(OVERLAY_CUSTOMIZATION_STORAGE_KEY)
    if (!raw) {
      return defaultOverlayCustomization
    }

    return sanitizeOverlayCustomization(JSON.parse(raw))
  } catch {
    return defaultOverlayCustomization
  }
}

export function writeStoredOverlayCustomization(customization: OverlayCustomization) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    OVERLAY_CUSTOMIZATION_STORAGE_KEY,
    JSON.stringify(customization),
  )
}

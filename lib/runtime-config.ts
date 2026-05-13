const LOCAL_FRONTEND_URL = "http://localhost:3001"
const LOCAL_API_URL = "http://localhost:5000"

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

export function getSiteBaseUrl() {
  const configuredUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim()
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl)
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlash(window.location.origin)
  }

  return LOCAL_FRONTEND_URL
}

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const hostname = window.location?.hostname
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return LOCAL_API_URL
    }
  }

  const configuredUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim()
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl)
  }

  return LOCAL_API_URL
}

export function getSocketUrl() {
  return getApiBaseUrl()
}

function normalizeWhatsAppNumber(value: string) {
  return value.replace(/[^\d]/g, "")
}

function slugifyOverlayName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "creator"
  )
}

export type OverlayUrlMode = "full" | "gifts" | "goal" | "leaderboard" | "account"

export function getOverlayUrl(
  user?: { id?: string; name?: string; overlaySlug?: string } | null,
  mode: OverlayUrlMode = "full",
) {
  const userId = String(user?.id || "").trim()

  if (!userId) {
    return `${getSiteBaseUrl()}/overlay`
  }

  const slug = String(user?.overlaySlug || slugifyOverlayName(user?.name || "")).trim()
  const baseUrl = `${getSiteBaseUrl()}/overlay/${encodeURIComponent(slug)}/${encodeURIComponent(userId)}`
  return mode === "full" ? baseUrl : `${baseUrl}/${mode}`
}

export function getPublicMonnifyMode() {
  const mode = String(process.env.NEXT_PUBLIC_MONNIFY_MODE || "").trim().toLowerCase()
  return mode === "live" ? "live" : "sandbox"
}

export function getWhatsAppLiveChatNumber() {
  return normalizeWhatsAppNumber(String(process.env.NEXT_PUBLIC_WHATSAPP_LIVECHAT_NUMBER || "").trim())
}

export function getWhatsAppLiveChatMessage() {
  return String(
    process.env.NEXT_PUBLIC_WHATSAPP_LIVECHAT_MESSAGE ||
      "Hi, I would like to start a live chat on StreamTip.",
  ).trim()
}

export function getWhatsAppLiveChatUrl() {
  const phoneNumber = getWhatsAppLiveChatNumber()

  if (!phoneNumber) {
    return ""
  }

  const message = getWhatsAppLiveChatMessage()
  const search = message ? `?text=${encodeURIComponent(message)}` : ""

  return `https://wa.me/${phoneNumber}${search}`
}

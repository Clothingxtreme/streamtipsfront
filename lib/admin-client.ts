import { getApiBaseUrl } from "@/lib/runtime-config"

export const ADMIN_SESSION_STORAGE_KEY = "streamtip.admin.session"

export function getStoredAdminToken() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || ""
}

export function setStoredAdminToken(token: string) {
  if (typeof window === "undefined") {
    return
  }

  if (!token) {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token)
}

export async function adminRequest(path: string, init: RequestInit = {}) {
  const token = getStoredAdminToken()
  const method = String(init.method || "GET").toUpperCase()
  const headers = new Headers(init.headers || {})

  if (token) {
    headers.set("x-admin-token", token)
  }

  const primaryRequest = () =>
    fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
    })

  try {
    return await primaryRequest()
  } catch (error) {
    // Some mobile/proxy setups fail CORS preflight on custom headers.
    // For GET-only requests, retry without custom headers using query token fallback.
    if (method !== "GET" || !token) {
      throw error
    }

    const separator = path.includes("?") ? "&" : "?"
    const fallbackPath = `${path}${separator}adminToken=${encodeURIComponent(token)}`
    return fetch(`${getApiBaseUrl()}${fallbackPath}`, {
      ...init,
      headers: init.headers,
    })
  }
}

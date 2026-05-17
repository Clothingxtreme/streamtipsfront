import type { AppUser } from "@/lib/user"
import { getApiBaseUrl } from "@/lib/runtime-config"

export const AUTH_SESSION_STORAGE_KEY = "streamtip.auth.session"

export interface AuthResponse {
  user: AppUser
  sessionToken: string
  warning?: string
  nextStep?: "dashboard" | "payout"
}

export function getStoredSessionToken() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY) || ""
}

export function setStoredSessionToken(token: string) {
  if (typeof window === "undefined") {
    return
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, token)
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const token = getStoredSessionToken()
  const headers = new Headers(init.headers || {})

  if (token) {
    headers.set("x-session-token", token)
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  })
}

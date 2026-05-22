"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  adminRequest,
  ADMIN_SESSION_STORAGE_KEY,
  getStoredAdminToken,
  setStoredAdminToken,
} from "@/lib/admin-client"
import { getApiBaseUrl } from "@/lib/runtime-config"

type AdminUser = {
  email: string
}

type AdminAuthContextValue = {
  admin: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AdminUser>
  logout: () => Promise<void>
  refreshAdmin: () => Promise<AdminUser | null>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshAdmin = useCallback(async () => {
    const tokenSnapshot = getStoredAdminToken()
    try {
      const response = await adminRequest("/admin/auth/me")

      if (!response.ok) {
        const latestToken = getStoredAdminToken()
        const isSameRequestToken =
          !tokenSnapshot || (latestToken && latestToken === tokenSnapshot)

        if ((response.status === 401 || response.status === 403) && isSameRequestToken) {
          setStoredAdminToken("")
        }
        setAdmin(null)
        return null
      }

      const data = (await response.json()) as { admin: AdminUser }
      setAdmin(data.admin)
      return data.admin
    } catch {
      setAdmin(null)
      return null
    }
  }, [])

  useEffect(() => {
    void refreshAdmin().finally(() => setIsLoading(false))
  }, [refreshAdmin])

  useEffect(() => {
    const syncAdmin = (event: StorageEvent) => {
      if (event.key !== ADMIN_SESSION_STORAGE_KEY) {
        return
      }

      void refreshAdmin()
    }

    window.addEventListener("storage", syncAdmin)
    return () => window.removeEventListener("storage", syncAdmin)
  }, [refreshAdmin])

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${getApiBaseUrl()}/admin/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.error || "Admin login failed.")
    }

    setStoredAdminToken(data.token)
    setAdmin(data.admin)
    return data.admin as AdminUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await adminRequest("/admin/auth/logout", { method: "POST" })
    } finally {
      setStoredAdminToken("")
      setAdmin(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      admin,
      isLoading,
      isAuthenticated: Boolean(admin),
      login,
      logout,
      refreshAdmin,
    }),
    [admin, isLoading, login, logout, refreshAdmin],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider")
  }

  return context
}

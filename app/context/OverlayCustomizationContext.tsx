"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  defaultOverlayCustomization,
  sanitizeOverlayCustomization,
  type GiftPackId,
  type OverlayCustomization,
} from "@/lib/overlay-customization"
import { useAuth } from "@/app/context/AuthContext"
import { fetchOverlayState, saveOverlayState } from "@/lib/overlay-state-client"

type OverlayCustomizationContextValue = {
  customization: OverlayCustomization
  updateCustomization: <K extends keyof OverlayCustomization>(
    key: K,
    value: OverlayCustomization[K],
  ) => void
}

const OverlayCustomizationContext = createContext<OverlayCustomizationContextValue | null>(null)

export function OverlayCustomizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [customization, setCustomization] = useState<OverlayCustomization>(
    defaultOverlayCustomization,
  )
  const latestCustomizationRef = useRef<OverlayCustomization>(defaultOverlayCustomization)
  const storageKey = user
    ? `streamtip.overlay.customization.${user.id}`
    : "streamtip.overlay.customization.guest"

  const setCustomizationState = useCallback((nextCustomization: OverlayCustomization) => {
    latestCustomizationRef.current = nextCustomization
    setCustomization(nextCustomization)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem(storageKey)
      setCustomizationState(
        raw ? sanitizeOverlayCustomization(JSON.parse(raw)) : defaultOverlayCustomization,
      )
    } catch {
      setCustomizationState(defaultOverlayCustomization)
    }
  }, [setCustomizationState, storageKey])

  useEffect(() => {
    if (!user) return

    let cancelled = false

    void fetchOverlayState()
      .then((state) => {
        if (cancelled) return

        setCustomizationState(state.customization)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, JSON.stringify(state.customization))
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [setCustomizationState, storageKey, user])

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) {
        return
      }

      try {
        const raw = window.localStorage.getItem(storageKey)
        setCustomizationState(
          raw ? sanitizeOverlayCustomization(JSON.parse(raw)) : defaultOverlayCustomization,
        )
      } catch {
        setCustomizationState(defaultOverlayCustomization)
      }
    }

    window.addEventListener("storage", syncFromStorage)
    return () => window.removeEventListener("storage", syncFromStorage)
  }, [setCustomizationState, storageKey])

  const updateCustomization = useCallback(
    <K extends keyof OverlayCustomization>(key: K, value: OverlayCustomization[K]) => {
      const nextValue =
        key === "giftPack"
          ? ((value as GiftPackId) || defaultOverlayCustomization.giftPack)
          : value

      const nextCustomization = {
        ...latestCustomizationRef.current,
        [key]: nextValue,
      }

      setCustomizationState(nextCustomization)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(nextCustomization))
      }
      if (user) {
        void saveOverlayState({ customization: nextCustomization }).catch(() => undefined)
      }
    },
    [setCustomizationState, storageKey, user],
  )

  const value = useMemo(
    () => ({
      customization,
      updateCustomization,
    }),
    [customization, updateCustomization],
  )

  return (
    <OverlayCustomizationContext.Provider value={value}>
      {children}
    </OverlayCustomizationContext.Provider>
  )
}

export function useOverlayCustomization() {
  const context = useContext(OverlayCustomizationContext)

  if (!context) {
    throw new Error("useOverlayCustomization must be used inside OverlayCustomizationProvider")
  }

  return context
}

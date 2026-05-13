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
  defaultCustomGifts,
  sanitizeCustomGifts,
  type CustomGiftDefinition,
} from "@/lib/custom-gifts"
import { useAuth } from "@/app/context/AuthContext"
import { fetchOverlayState, saveOverlayState } from "@/lib/overlay-state-client"

type CustomGiftsContextValue = {
  customGifts: CustomGiftDefinition[]
  saveCustomGifts: (value: CustomGiftDefinition[]) => Promise<void>
  resetCustomGifts: () => Promise<void>
}

const CustomGiftsContext = createContext<CustomGiftsContextValue | null>(null)

export function CustomGiftsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [customGifts, setCustomGifts] = useState<CustomGiftDefinition[]>(defaultCustomGifts)
  const storageKey = user ? `streamtip.custom.gifts.${user.id}` : "streamtip.custom.gifts.guest"

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const raw = window.localStorage.getItem(storageKey)
      setCustomGifts(raw ? sanitizeCustomGifts(JSON.parse(raw)) : defaultCustomGifts)
    } catch {
      setCustomGifts(defaultCustomGifts)
    }
  }, [storageKey])

  useEffect(() => {
    if (!user) return

    let cancelled = false

    void fetchOverlayState()
      .then((state) => {
        if (cancelled) return

        setCustomGifts(state.customGifts)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(storageKey, JSON.stringify(state.customGifts))
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [storageKey, user])

  useEffect(() => {
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) {
        return
      }

      try {
        const raw = window.localStorage.getItem(storageKey)
        setCustomGifts(raw ? sanitizeCustomGifts(JSON.parse(raw)) : defaultCustomGifts)
      } catch {
        setCustomGifts(defaultCustomGifts)
      }
    }

    window.addEventListener("storage", syncFromStorage)
    return () => window.removeEventListener("storage", syncFromStorage)
  }, [storageKey])

  const saveCustomGifts = useCallback(async (value: CustomGiftDefinition[]) => {
    const nextValue = sanitizeCustomGifts(value)
    setCustomGifts(nextValue)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(nextValue))
    }
    if (user) {
      await saveOverlayState({ customGifts: nextValue })
    }
  }, [storageKey, user])

  const resetCustomGifts = useCallback(async () => {
    setCustomGifts(defaultCustomGifts)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(defaultCustomGifts))
    }
    if (user) {
      await saveOverlayState({ customGifts: defaultCustomGifts })
    }
  }, [storageKey, user])

  const contextValue = useMemo(
    () => ({
      customGifts,
      saveCustomGifts,
      resetCustomGifts,
    }),
    [customGifts, resetCustomGifts, saveCustomGifts],
  )

  return (
    <CustomGiftsContext.Provider value={contextValue}>
      {children}
    </CustomGiftsContext.Provider>
  )
}

export function useCustomGifts() {
  const context = useContext(CustomGiftsContext)

  if (!context) {
    throw new Error("useCustomGifts must be used inside CustomGiftsProvider")
  }

  return context
}

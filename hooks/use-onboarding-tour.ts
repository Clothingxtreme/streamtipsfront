"use client"

import { useCallback } from "react"
import { authRequest } from "@/lib/auth-client"
import type { AppUser } from "@/lib/user"

export const STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT = "streamtip:onboarding-tour:restart"

function getLocalStorageKey(userId: string) {
  return `streamtip_onboarding_tour_completed:${userId}`
}

export function readTourCompletionFromStorage(userId: string) {
  if (typeof window === "undefined" || !userId) {
    return false
  }

  return window.localStorage.getItem(getLocalStorageKey(userId)) === "true"
}

export function writeTourCompletionToStorage(userId: string, completed: boolean) {
  if (typeof window === "undefined" || !userId) {
    return
  }

  if (completed) {
    window.localStorage.setItem(getLocalStorageKey(userId), "true")
    return
  }

  window.localStorage.removeItem(getLocalStorageKey(userId))
}

export function useOnboardingTour() {
  const shouldAutoStartTour = useCallback((user: AppUser | null) => {
    if (!user || user.role !== "creator" || !user.id) {
      return false
    }

    const completedOnBackend = Boolean(user.onboardingTourCompleted)
    const completedInStorage = readTourCompletionFromStorage(user.id)

    return !completedOnBackend && !completedInStorage
  }, [])

  const markTourCompleted = useCallback(async (user: AppUser | null) => {
    if (!user?.id) {
      return
    }

    writeTourCompletionToStorage(user.id, true)

    try {
      await authRequest("/user/onboarding-tour", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      })
    } catch {
      // localStorage fallback remains the source of truth when backend sync fails
    }
  }, [])

  return {
    shouldAutoStartTour,
    markTourCompleted,
  }
}

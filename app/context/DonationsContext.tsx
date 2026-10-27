"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { io } from "socket.io-client"
import { useAuth } from "@/app/context/AuthContext"
import { readStoredAppPreferences } from "@/lib/app-preferences"
import { authRequest, getStoredSessionToken } from "@/lib/auth-client"
import { emitNotificationFeedback } from "@/lib/notification-runtime"
import { getSocketUrl } from "@/lib/runtime-config"

type Donation = {
  _id: string
  creatorId?: string
  amount: number | string
  sender?: string
  senderName?: string
  createdAt?: string | Date
  provider?: string
  fundsFlow?: string
  paymentStatus?: string
  walletStatus?: string
  status?: string
}

export type DonationsLoadStatus = "idle" | "loading" | "ready" | "error"

type DonationsContextType = {
  donations: Donation[]
  setDonations: Dispatch<SetStateAction<Donation[]>>
  /** Load state of the /donations request. Additive; existing consumers can ignore it. */
  status: DonationsLoadStatus
  reloadDonations: () => void
}

const DonationsContext = createContext<DonationsContextType | null>(null)

const normalizeDonation = (donation: any): Donation => ({
  ...donation,
  senderName: donation.senderName || donation.sender || "Anonymous",
  sender: donation.sender || donation.senderName || "Anonymous",
  createdAt: donation.createdAt ? new Date(donation.createdAt) : donation.createdAt,
  walletStatus:
    String(donation.provider || "").toLowerCase() === "monnify" &&
    String(donation.paymentStatus || "").toUpperCase() === "PAID" &&
    String(donation.walletStatus || "").toLowerCase() !== "rejected"
      ? "available"
      : donation.walletStatus,
  status:
    String(donation.provider || "").toLowerCase() === "monnify" &&
    String(donation.paymentStatus || "").toUpperCase() === "PAID" &&
    String(donation.walletStatus || "").toLowerCase() !== "rejected"
      ? "completed"
      : donation.status,
})

export const DonationsProvider = ({ children }: { children: ReactNode }) => {
  const [donations, setDonations] = useState<Donation[]>([])
  const [status, setStatus] = useState<DonationsLoadStatus>("idle")
  const fetchDonationsRef = useRef<(() => void) | null>(null)
  const { user, isAuthenticated, refreshUser } = useAuth()
  const userId = user?.id

  const maybeShowDonationNotification = (donation: Donation) => {
    if (typeof window === "undefined") {
      return
    }

    const preferences = readStoredAppPreferences()
    if (!preferences.donationNotifications) {
      return
    }

    const senderName = donation.senderName || "Anonymous"
    const amount = Number(donation.amount) || 0

    void emitNotificationFeedback("donation", preferences, {
      title: "New donation received",
      body: `${senderName} sent NGN ${amount.toLocaleString()}`,
      tag: `donation-${donation._id ?? senderName}-${amount}`,
    })
  }

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setDonations([])
      setStatus("idle")
      fetchDonationsRef.current = null
      return
    }

    const fetchDonations = () => {
      // Only show a loading state before the first successful load; later refreshes keep the current list.
      setStatus((current) => (current === "ready" ? current : "loading"))
      void authRequest("/donations")
        .then((res) => res.json())
        .then((data) => {
          const fixed = Array.isArray(data) ? data.map((d: any) => normalizeDonation(d)) : []
          setDonations(fixed)
          setStatus((current) => (Array.isArray(data) ? "ready" : current === "ready" ? current : "error"))
          void refreshUser()
        })
        .catch(() => {
          // silent - network/server error; current state is preserved
          setStatus((current) => (current === "ready" ? current : "error"))
        })
    }
    fetchDonationsRef.current = fetchDonations

    fetchDonations()

    const socket = io(getSocketUrl(), {
      transports: ["websocket"],
      auth: {
        sessionToken: getStoredSessionToken(),
      },
    })

    let isFirstConnect = true
    socket.on("connect", () => {
      if (isFirstConnect) {
        // Initial connect is already covered by the fetchDonations() call above.
        isFirstConnect = false
        return
      }
      // Re-fetch on reconnect so payments received while disconnected (e.g.
      // during a Render server restart) appear without needing a page refresh.
      fetchDonations()
    })

    socket.on("newDonation", (data) => {
      if (data?.manual) {
        return
      }

      const fixed = normalizeDonation(data)

      if (fixed.creatorId && fixed.creatorId !== userId) {
        return
      }

      setDonations(prev => [fixed, ...prev])
      maybeShowDonationNotification(fixed)
      void refreshUser()
    })

    return () => {socket.disconnect()}
  }, [isAuthenticated, refreshUser, userId])

  const reloadDonations = useCallback(() => {
    fetchDonationsRef.current?.()
  }, [])

  return (
    <DonationsContext.Provider value={{ donations, setDonations, status, reloadDonations }}>
      {children}
    </DonationsContext.Provider>
  )
}

export const useDonations = () => {
  const context = useContext(DonationsContext)
  if (!context) throw new Error("useDonations must be used inside provider")
  return context
}


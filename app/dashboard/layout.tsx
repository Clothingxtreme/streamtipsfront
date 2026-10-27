"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SafeCreatorGuideTour } from "@/components/onboarding/safe-creator-guide-tour"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { authRequest } from "@/lib/auth-client"

type AccountNotification = {
  id: string
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
  readAt?: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [platformUpdate, setPlatformUpdate] = useState<AccountNotification | null>(null)
  const [checkingPlatformUpdate, setCheckingPlatformUpdate] = useState(true)
  const [closingPlatformUpdate, setClosingPlatformUpdate] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (!isAuthenticated) {
      setPlatformUpdate(null)
      setCheckingPlatformUpdate(false)
      return
    }

    let active = true

    const loadPlatformUpdate = async () => {
      setCheckingPlatformUpdate(true)
      try {
        const response = await authRequest("/notifications")
        const payload = await response.json().catch(() => null)

        if (!response.ok || !active) {
          return
        }

        const notifications = Array.isArray(payload?.notifications) ? payload.notifications : []
        const pendingUpdate = notifications.find((item: AccountNotification) => {
          return Boolean(item?.metadata?.requiresPopup) && !item?.readAt
        })

        setPlatformUpdate(pendingUpdate || null)
      } catch {
        if (active) {
          setPlatformUpdate(null)
        }
      } finally {
        if (active) {
          setCheckingPlatformUpdate(false)
        }
      }
    }

    void loadPlatformUpdate()

    return () => {
      active = false
    }
  }, [isAuthenticated])

  const closePlatformUpdate = async () => {
    if (!platformUpdate?.id) {
      return
    }

    setClosingPlatformUpdate(true)
    try {
      const response = await authRequest(`/notifications/${platformUpdate.id}/read`, {
        method: "POST",
      })

      if (response.ok) {
        setPlatformUpdate(null)
      }
    } finally {
      setClosingPlatformUpdate(false)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-6 py-5">
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 overflow-x-hidden">
      <SafeCreatorGuideTour
        mobileOpen={mobileMenuOpen}
        onMobileOpenChange={setMobileMenuOpen}
        blocked={checkingPlatformUpdate || Boolean(platformUpdate)}
      >
        <DashboardSidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
        <main className="flex-1 overflow-y-auto dashboard-scrollbar pt-14 md:pt-0">
          {children}
        </main>
      </SafeCreatorGuideTour>
      <Dialog open={Boolean(platformUpdate)} onOpenChange={() => undefined}>
        <DialogContent
          showCloseButton={false}
          className="border-zinc-800 bg-zinc-950 text-white sm:max-w-xl"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl leading-tight text-white">
              {platformUpdate?.title || "Platform Update"}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm leading-6 text-zinc-300">
            {platformUpdate?.message}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void closePlatformUpdate()}
              disabled={closingPlatformUpdate}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {closingPlatformUpdate ? "Closing..." : "Close Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

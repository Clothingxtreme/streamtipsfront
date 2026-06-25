"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, AtSign, Link2, RadioTower } from "lucide-react"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SafeCreatorGuideTour } from "@/components/onboarding/safe-creator-guide-tour"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [platformUpdate, setPlatformUpdate] = useState<AccountNotification | null>(null)
  const [checkingPlatformUpdate, setCheckingPlatformUpdate] = useState(true)
  const [closingPlatformUpdate, setClosingPlatformUpdate] = useState(false)
  const [socialPromptOpen, setSocialPromptOpen] = useState(false)
  const [socialPromptDismissed, setSocialPromptDismissed] = useState(false)
  const [savingSocials, setSavingSocials] = useState(false)
  const [socialPromptError, setSocialPromptError] = useState("")
  const [socialDraft, setSocialDraft] = useState({
    platform: "tiktok",
    handle: "",
    profileUrl: "",
    liveUrl: "",
  })

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

  useEffect(() => {
    if (!isAuthenticated || !user || socialPromptDismissed) {
      setSocialPromptOpen(false)
      return
    }

    const socialProfile = user.socialProfile || {}
    const hasSocials = Boolean(
      socialProfile.handle || socialProfile.profileUrl || socialProfile.liveUrl,
    )

    if (hasSocials) {
      setSocialPromptOpen(false)
      return
    }

    setSocialDraft({
      platform: socialProfile.platform || "tiktok",
      handle: socialProfile.handle || "",
      profileUrl: socialProfile.profileUrl || "",
      liveUrl: socialProfile.liveUrl || "",
    })
    setSocialPromptError("")
    setSocialPromptOpen(true)
  }, [isAuthenticated, socialPromptDismissed, user])

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

  const saveSocialPrompt = async () => {
    if (!user) return

    if (!socialDraft.handle.trim() && !socialDraft.profileUrl.trim() && !socialDraft.liveUrl.trim()) {
      setSocialPromptError("Add at least your handle, profile link, or live link.")
      return
    }

    setSavingSocials(true)
    setSocialPromptError("")

    try {
      const response = await authRequest("/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: user.firstName || user.identity?.firstName || "",
          middleName: user.middleName || user.identity?.middleName || "",
          lastName: user.lastName || user.identity?.lastName || "",
          email: user.email,
          phoneNumber: user.phoneNumber || "",
          dateOfBirth: user.identity?.dateOfBirth?.slice(0, 10) || "",
          profileImage: user.profileImage || "",
          socialProfile: {
            platform: socialDraft.platform,
            handle: socialDraft.handle.trim(),
            profileUrl: socialDraft.profileUrl.trim(),
            liveUrl: socialDraft.liveUrl.trim(),
          },
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not save social profile.")
      }

      await refreshUser()
      setSocialPromptOpen(false)
      setSocialPromptDismissed(true)
    } catch (error) {
      setSocialPromptError(error instanceof Error ? error.message : "Could not save social profile.")
    } finally {
      setSavingSocials(false)
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
      <Dialog open={socialPromptOpen} onOpenChange={setSocialPromptOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-2xl">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200">
              <RadioTower className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl leading-tight text-white">
              Add your social page
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm leading-6 text-zinc-300">
            Add the account you use for live streams so StreamTip can help admins find your page and support your live setup.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Main platform</label>
              <Select
                value={socialDraft.platform}
                onValueChange={(value) => setSocialDraft((current) => ({ ...current, platform: value }))}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  {["tiktok", "instagram", "youtube", "x", "twitch", "facebook", "other"].map((platform) => (
                    <SelectItem key={platform} value={platform} className="text-white focus:bg-zinc-800 focus:text-white">
                      {platform === "x" ? "X / Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <AtSign className="h-4 w-4 text-zinc-500" />
                Handle
              </label>
              <Input
                value={socialDraft.handle}
                onChange={(event) =>
                  setSocialDraft((current) => ({
                    ...current,
                    handle: event.target.value.replace(/^@+/, ""),
                  }))
                }
                placeholder="creatorhandle"
                className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Link2 className="h-4 w-4 text-zinc-500" />
                Profile link
              </label>
              <Input
                value={socialDraft.profileUrl}
                onChange={(event) =>
                  setSocialDraft((current) => ({ ...current, profileUrl: event.target.value }))
                }
                placeholder="https://www.tiktok.com/@creatorhandle"
                className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <RadioTower className="h-4 w-4 text-zinc-500" />
                Live link
              </label>
              <Input
                value={socialDraft.liveUrl}
                onChange={(event) =>
                  setSocialDraft((current) => ({ ...current, liveUrl: event.target.value }))
                }
                placeholder="Optional direct live URL"
                className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>
          {socialPromptError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {socialPromptError}
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSocialPromptDismissed(true)
                setSocialPromptOpen(false)
              }}
              className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
            >
              Later
            </Button>
            <Button
              type="button"
              onClick={() => void saveSocialPrompt()}
              disabled={savingSocials}
              className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
            >
              {savingSocials ? "Saving..." : "Save Socials"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

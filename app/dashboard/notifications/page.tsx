"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  CheckCircle2,
  MonitorSmartphone,
  Sparkles,
  Volume2,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useAppPreferences } from "@/app/context/AppPreferencesContext"
import { authRequest } from "@/lib/auth-client"

type AccountNotification = {
  id: string
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
  createdAt?: string
  readAt?: string
}

function formatDate(value?: string) {
  if (!value) return "Not available"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export default function NotificationsPage() {
  const { preferences, updatePreference } = useAppPreferences()
  const [statusMessage, setStatusMessage] = useState("")
  const [accountNotifications, setAccountNotifications] = useState<AccountNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingUpdates, setLoadingUpdates] = useState(false)
  const [busyNotificationAction, setBusyNotificationAction] = useState("")
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  )

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionState("unsupported")
      return
    }

    setPermissionState(window.Notification.permission)
  }, [])

  const loadAccountNotifications = async () => {
    setLoadingUpdates(true)
    try {
      const response = await authRequest("/notifications")
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Could not load account updates.")
      }
      setAccountNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      setUnreadCount(Number(payload?.unreadCount) || 0)
    } catch (requestError) {
      setStatusMessage(requestError instanceof Error ? requestError.message : "Could not load account updates.")
    } finally {
      setLoadingUpdates(false)
    }
  }

  useEffect(() => {
    void loadAccountNotifications()
  }, [])

  const markAllRead = async () => {
    setBusyNotificationAction("mark-all-read")
    try {
      const response = await authRequest("/notifications/read-all", { method: "POST" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Could not update notifications.")
      }
      setAccountNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      setUnreadCount(Number(payload?.unreadCount) || 0)
      setStatusMessage("All account updates marked as read.")
    } catch (requestError) {
      setStatusMessage(requestError instanceof Error ? requestError.message : "Could not update notifications.")
    } finally {
      setBusyNotificationAction("")
    }
  }

  const markOneRead = async (id: string) => {
    if (!id) return
    setBusyNotificationAction(`mark-read-${id}`)
    try {
      const response = await authRequest(`/notifications/${id}/read`, { method: "POST" })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Could not update this notification.")
      }
      setAccountNotifications(Array.isArray(payload?.notifications) ? payload.notifications : [])
      setUnreadCount(Number(payload?.unreadCount) || 0)
    } catch (requestError) {
      setStatusMessage(requestError instanceof Error ? requestError.message : "Could not update this notification.")
    } finally {
      setBusyNotificationAction("")
    }
  }

  const summaryCards = useMemo(
    () => [
      {
        label: "Desktop alerts",
        value:
          permissionState === "unsupported"
            ? "Unsupported"
            : permissionState === "granted"
              ? "Enabled"
              : "Needs permission",
        icon: MonitorSmartphone,
      },
      {
        label: "Donation updates",
        value: preferences.donationNotifications ? "On" : "Off",
        icon: Sparkles,
      },
      {
        label: "Payout updates",
        value: preferences.payoutNotifications ? "On" : "Off",
        icon: Wallet,
      },
      {
        label: "Notification sounds",
        value: preferences.notificationSounds ? "On" : "Muted",
        icon: Volume2,
      },
    ],
    [permissionState, preferences],
  )

  const handleToggle = async (
    key:
      | "desktopNotifications"
      | "donationNotifications"
      | "payoutNotifications"
      | "notificationSounds",
    enabled: boolean,
  ) => {
    const nextPreferences = await updatePreference(key, enabled)

    if (key === "desktopNotifications") {
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermissionState(window.Notification.permission)
      }

      setStatusMessage(
        nextPreferences.desktopNotifications
          ? "Desktop notifications are enabled for supported browsers."
          : enabled
            ? "Desktop notifications were blocked or not supported by this browser."
            : "Desktop notifications are turned off.",
      )
      return
    }

    setStatusMessage("")
  }

  const notificationToggles = [
    {
      id: "desktopNotifications" as const,
      label: "Desktop Notifications",
      description: "Show browser alerts when donations or payouts happen.",
      icon: Bell,
    },
    {
      id: "donationNotifications" as const,
      label: "Donation Alerts",
      description: "Allow incoming donation events to trigger your notification flow.",
      icon: Sparkles,
    },
    {
      id: "payoutNotifications" as const,
      label: "Payout Alerts",
      description: "Notify you when a withdrawal succeeds or a payout update arrives.",
      icon: Wallet,
    },
    {
      id: "notificationSounds" as const,
      label: "Notification Sounds",
      description: "Play browser audio for donation and payout notifications.",
      icon: Volume2,
    },
  ]

  return (
    <div data-tour="notifications-main" className="max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-zinc-500">
          Control browser alerts, event-specific notifications, and the sounds tied to them.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">{label}</p>
              <div className="rounded-lg bg-zinc-800 p-2">
                <Icon className="h-4 w-4 text-zinc-300" />
              </div>
            </div>
            <p className="mt-4 text-lg font-semibold capitalize text-white">{value}</p>
          </div>
        ))}
      </div>

      {statusMessage ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Account Updates</h2>
            <p className="mt-1 text-sm text-zinc-500">
              KYC and tier-review updates appear here for approvals, rejections, and submissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              Unread: {unreadCount}
            </span>
            <Button
              type="button"
              variant="outline"
              className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
              onClick={() => void markAllRead()}
              disabled={busyNotificationAction === "mark-all-read" || unreadCount <= 0}
            >
              Mark all read
            </Button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {loadingUpdates ? (
            <p className="text-sm text-zinc-400">Loading account updates...</p>
          ) : accountNotifications.length ? (
            <div className="space-y-3">
              {accountNotifications.map((item) => {
                const unread = !item.readAt
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border px-4 py-3",
                      unread ? "border-emerald-500/30 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.title || "Update"}</p>
                        <p className="mt-1 text-sm text-zinc-300">{item.message || "No details provided."}</p>
                        <p className="mt-2 text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
                      </div>
                      {unread ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                          onClick={() => void markOneRead(item.id)}
                          disabled={busyNotificationAction === `mark-read-${item.id}`}
                        >
                          Mark read
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-500">Read</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No account updates yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Alert Channels</h2>
          <p className="mt-1 text-sm text-zinc-500">
            These settings save instantly and are used by live donation and payout events.
          </p>
        </div>

        <div className="space-y-3 p-6">
          {notificationToggles.map(({ id, label, description, icon: Icon }) => {
            const enabled = preferences[id]

            return (
              <div
                key={id}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-2xl p-4 transition-all",
                  enabled
                    ? "border border-purple-500/30 bg-purple-500/10"
                    : "border border-zinc-800 bg-zinc-950/60",
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("rounded-xl p-2.5", enabled ? "bg-purple-500/20" : "bg-zinc-800")}>
                    <Icon className={cn("h-5 w-5", enabled ? "text-purple-300" : "text-zinc-500")} />
                  </div>
                  <div>
                    <p className={cn("font-medium", enabled ? "text-white" : "text-zinc-300")}>
                      {label}
                    </p>
                    <p className="text-sm text-zinc-500">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    void handleToggle(id, checked)
                  }}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  MonitorSmartphone,
  Sparkles,
  Volume2,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { EmptyState, Notice, PageHeader, PageShell, Panel } from "@/components/dashboard/page-kit"
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
    <PageShell data-tour="notifications-main">
      <PageHeader
        title="Notifications"
        description="Account updates from StreamTip, and how you want to be alerted about tips and payouts."
      />

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-zinc-900/60 px-3 py-2.5">
            <Icon className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            <div className="min-w-0">
              <dt className="truncate text-xs text-zinc-500">{label}</dt>
              <dd className="truncate text-sm font-medium capitalize text-white">{value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {statusMessage ? <Notice tone="success">{statusMessage}</Notice> : null}

      <Panel
        title="Account updates"
        description="KYC and tier-review approvals, rejections and submissions."
        actions={
          <>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-300">
              {unreadCount} unread
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
              onClick={() => void markAllRead()}
              disabled={busyNotificationAction === "mark-all-read" || unreadCount <= 0}
            >
              Mark all read
            </Button>
          </>
        }
      >
        {loadingUpdates ? (
          <div className="space-y-2" aria-label="Loading account updates">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl bg-white/[0.04] motion-reduce:animate-none" />
            ))}
          </div>
        ) : accountNotifications.length ? (
          <ul className="divide-y divide-white/[0.06]">
            {accountNotifications.map((item) => {
              const unread = !item.readAt
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", unread ? "bg-purple-400" : "bg-transparent")}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className={cn("font-medium", unread ? "text-white" : "text-zinc-300")}>
                        {item.title || "Update"}
                        {unread ? <span className="sr-only"> (unread)</span> : null}
                      </p>
                      <p className="mt-0.5 text-sm text-zinc-400">{item.message || "No details provided."}</p>
                      <p className="mt-1 text-xs text-zinc-500">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  {unread ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                      onClick={() => void markOneRead(item.id)}
                      disabled={busyNotificationAction === `mark-read-${item.id}`}
                    >
                      Mark read
                    </Button>
                  ) : (
                    <span className="shrink-0 text-xs text-zinc-500">Read</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState title="No account updates yet">Approvals and review results will show up here.</EmptyState>
        )}
      </Panel>

      <Panel title="Alert channels" description="Saved instantly and used for live tips and payout events.">
        <ul className="divide-y divide-white/[0.06]">
          {notificationToggles.map(({ id, label, description, icon: Icon }) => {
            const enabled = preferences[id]

            return (
              <li key={id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className={cn("h-5 w-5 shrink-0", enabled ? "text-purple-300" : "text-zinc-500")} aria-hidden />
                  <div className="min-w-0">
                    <p className="font-medium text-white">{label}</p>
                    <p className="text-sm text-zinc-500">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  aria-label={label}
                  onCheckedChange={(checked) => {
                    void handleToggle(id, checked)
                  }}
                  className="data-[state=checked]:bg-purple-500"
                />
              </li>
            )
          })}
        </ul>
      </Panel>
    </PageShell>
  )
}

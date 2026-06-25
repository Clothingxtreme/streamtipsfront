"use client"

import { useEffect, useMemo, useState } from "react"
import { AtSign, ExternalLink, Link2, RadioTower, RefreshCcw, Search, SignalHigh, User } from "lucide-react"
import { adminRequest } from "@/lib/admin-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type SocialProfile = {
  platform?: string
  handle?: string
  profileUrl?: string
  liveUrl?: string
  isLive?: boolean
  notes?: string
  updatedAt?: string
}

type SocialUser = {
  id: string
  name: string
  email: string
  status?: "active" | "suspended" | "banned"
  profileImage?: string
  socialProfile?: SocialProfile
  createdAt?: string
}

type SocialSummary = {
  total: number
  live: number
  withSocial: number
}

const platforms = ["all", "tiktok", "instagram", "youtube", "x", "twitch", "facebook", "other"]

function formatPlatform(value?: string) {
  const platform = String(value || "").trim().toLowerCase()
  if (!platform) return "Not set"
  if (platform === "x") return "X / Twitter"
  return platform.charAt(0).toUpperCase() + platform.slice(1)
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ST"
}

function getBestSocialUrl(user: SocialUser) {
  return user.socialProfile?.liveUrl || user.socialProfile?.profileUrl || ""
}

export default function AdminSocialsPage() {
  const [users, setUsers] = useState<SocialUser[]>([])
  const [summary, setSummary] = useState<SocialSummary>({ total: 0, live: 0, withSocial: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("all")
  const [liveOnly, setLiveOnly] = useState(false)
  const [updatingId, setUpdatingId] = useState("")

  const liveUsers = useMemo(() => users.filter((user) => user.socialProfile?.isLive), [users])

  const loadUsers = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      if (platform !== "all") params.set("platform", platform)
      if (liveOnly) params.set("liveOnly", "true")

      const response = await adminRequest(`/admin/social-directory?${params.toString()}`)
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not load creator socials.")
      }

      setUsers(Array.isArray(data?.users) ? data.users : [])
      setSummary({
        total: Number(data?.summary?.total) || 0,
        live: Number(data?.summary?.live) || 0,
        withSocial: Number(data?.summary?.withSocial) || 0,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load creator socials.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateLiveState = async (user: SocialUser, isLive: boolean) => {
    setUpdatingId(user.id)
    setError("")
    setMessage("")

    try {
      const currentSocial = user.socialProfile || {}
      const response = await adminRequest(`/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialProfile: {
            ...currentSocial,
            isLive,
          },
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not update live status.")
      }

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                socialProfile: {
                  ...currentSocial,
                  isLive,
                  updatedAt: new Date().toISOString(),
                },
              }
            : item,
        ),
      )
      setSummary((current) => ({
        ...current,
        live: Math.max(0, current.live + (isLive ? 1 : -1)),
      }))
      setMessage(`${user.name} is now marked ${isLive ? "live" : "offline"}.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update live status.")
    } finally {
      setUpdatingId("")
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-4 py-2 text-sm text-fuchsia-100">
            <RadioTower className="h-4 w-4" />
            Creator socials
          </div>
          <h1 className="mt-4 text-3xl font-black text-white">Live Creator Directory</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Track each creator's social page, live link, profile photo, and live status from one admin view.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading}
          className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
        >
          <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Creators shown" value={summary.total.toLocaleString()} />
        <Metric label="With social links" value={summary.withSocial.toLocaleString()} />
        <Metric label="Marked live" value={summary.live.toLocaleString()} tone="live" />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Live now</h2>
            <p className="mt-1 text-sm text-zinc-500">Creators with the pink ring are marked live.</p>
          </div>
          <SignalHigh className="h-6 w-6 text-fuchsia-200" />
        </div>

        <div className="mt-5 flex gap-6 overflow-x-auto pb-2">
          {liveUsers.length ? (
            liveUsers.map((user) => (
              <a
                key={user.id}
                href={getBestSocialUrl(user) || undefined}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "group w-28 shrink-0 text-center",
                  !getBestSocialUrl(user) && "pointer-events-none opacity-60",
                )}
              >
                <LiveAvatar user={user} size="large" />
                <p className="mt-3 truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">@{user.socialProfile?.handle || "no-handle"}</p>
              </a>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
              No creator is marked live yet.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl lg:grid-cols-[1fr_220px_auto_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, handle, or link"
            className="border-zinc-700 bg-zinc-950/70 pl-11 text-white placeholder:text-zinc-500"
          />
        </div>

        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900">
            {platforms.map((item) => (
              <SelectItem key={item} value={item} className="text-white focus:bg-zinc-800 focus:text-white">
                {item === "all" ? "All platforms" : formatPlatform(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950/70 px-4 py-2 text-sm text-white">
          Live only
          <Switch checked={liveOnly} onCheckedChange={setLiveOnly} className="data-[state=checked]:bg-fuchsia-500" />
        </label>

        <Button
          type="button"
          variant="outline"
          onClick={() => void loadUsers()}
          disabled={loading}
          className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
        >
          Apply
        </Button>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4">
        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-zinc-400">
            Loading creator socials...
          </div>
        ) : users.length ? (
          users.map((user) => {
            const social = user.socialProfile || {}
            const destination = getBestSocialUrl(user)

            return (
              <article
                key={user.id}
                className="grid gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl lg:grid-cols-[auto_1fr_auto]"
              >
                <LiveAvatar user={user} />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-white">{user.name}</h2>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                      {formatPlatform(social.platform)}
                    </span>
                    {social.isLive ? (
                      <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/15 px-3 py-1 text-xs font-semibold text-fuchsia-100">
                        Live
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-zinc-500">{user.email}</p>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <SocialField icon={AtSign} label="Handle" value={social.handle ? `@${social.handle}` : "Not added"} />
                    <SocialField icon={Link2} label="Profile" value={social.profileUrl || "Not added"} />
                    <SocialField icon={RadioTower} label="Live link" value={social.liveUrl || "Uses profile link"} />
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:w-52">
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
                    Mark live
                    <Switch
                      checked={Boolean(social.isLive)}
                      disabled={updatingId === user.id}
                      onCheckedChange={(checked) => void updateLiveState(user, checked)}
                      className="data-[state=checked]:bg-fuchsia-500"
                    />
                  </label>
                  <Button
                    asChild
                    disabled={!destination}
                    className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
                  >
                    <a href={destination || "#"} target="_blank" rel="noreferrer">
                      Open Page
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </article>
            )
          })
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-zinc-400">
            No creators matched your filters.
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "live" }) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-5",
        tone === "live"
          ? "border-fuchsia-400/20 bg-fuchsia-400/10"
          : "border-white/10 bg-white/5",
      )}
    >
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function LiveAvatar({ user, size = "normal" }: { user: SocialUser; size?: "normal" | "large" }) {
  const live = Boolean(user.socialProfile?.isLive)
  const dimensions = size === "large" ? "h-24 w-24" : "h-20 w-20"

  return (
    <div className="relative inline-flex">
      <div
        className={cn(
          "rounded-full p-1",
          live
            ? "bg-[conic-gradient(from_20deg,#ec4899,#ff2d75,#ffffff,#ec4899)] shadow-[0_0_28px_rgba(236,72,153,0.38)]"
            : "bg-zinc-800",
        )}
      >
        <div className={cn("overflow-hidden rounded-full border-4 border-zinc-950 bg-zinc-900", dimensions)}>
          {user.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-black text-zinc-400">
              {getInitials(user.name) || <User className="h-7 w-7" />}
            </div>
          )}
        </div>
      </div>
      {live ? (
        <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-zinc-950 bg-fuchsia-500 text-white shadow-lg">
          <SignalHigh className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  )
}

function SocialField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AtSign
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-white">{value}</p>
    </div>
  )
}

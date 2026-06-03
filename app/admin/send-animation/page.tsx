"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, Send, Sparkles, UserRound } from "lucide-react"
import { adminRequest } from "@/lib/admin-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type StreamerAccount = {
  id: string
  name: string
  firstName?: string
  middleName?: string
  lastName?: string
  email: string
  role?: "creator" | "admin"
  status?: "active" | "suspended" | "banned"
}

type UsersResponse = {
  users: StreamerAccount[]
}

function getDisplayName(user: StreamerAccount) {
  const legalName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim()
  return legalName || user.name || user.email
}

function formatCurrency(amount: string) {
  const parsed = Number(amount.replace(/,/g, "")) || 0
  return parsed > 0 ? `NGN ${parsed.toLocaleString()}` : "NGN 0"
}

export default function SendAnimationPage() {
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<StreamerAccount[]>([])
  const [selectedUser, setSelectedUser] = useState<StreamerAccount | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const cleanAmount = amount.replace(/,/g, "")
  const parsedAmount = Number(cleanAmount) || 0
  const canSend = Boolean(selectedUser?.id && displayName.trim() && parsedAmount > 0 && !sending)

  const visibleUsers = useMemo(
    () => users.filter((user) => user.role !== "admin"),
    [users],
  )

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      const loadUsers = async () => {
        setLoadingUsers(true)
        setError("")

        try {
          const response = await adminRequest(
            `/admin/users?page=1&limit=50&q=${encodeURIComponent(query.trim())}`,
          )
          const payload = (await response.json().catch(() => null)) as UsersResponse | null

          if (!response.ok) {
            throw new Error((payload as any)?.error || "Could not load streamer accounts.")
          }

          if (!active) return

          setUsers(Array.isArray(payload?.users) ? payload.users : [])
        } catch (requestError) {
          if (!active) return
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load streamer accounts.",
          )
        } finally {
          if (active) {
            setLoadingUsers(false)
          }
        }
      }

      void loadUsers()
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  const sendAnimation = async () => {
    if (!canSend || !selectedUser) {
      return
    }

    setSending(true)
    setError("")
    setSuccess("")

    try {
      const response = await adminRequest("/admin/send-animation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: selectedUser.id,
          displayName: displayName.trim(),
          amount: parsedAmount,
          message: message.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not send animation.")
      }

      const connectedClients = Number(payload?.connectedClients || 0)
      setSuccess(
        connectedClients > 0
          ? `Animation sent to ${getDisplayName(selectedUser)}. ${connectedClients} overlay source${connectedClients === 1 ? "" : "s"} received it.`
          : `Animation sent to ${getDisplayName(selectedUser)}, but no overlay source is currently connected on this server.`,
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not send animation.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white">Send Animation</h1>
        <p className="text-zinc-400">
          Trigger a live gift animation on a streamer overlay without creating a donation record.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Streamer Account</h2>
              <p className="text-sm text-zinc-500">Search and select the account currently streaming.</p>
            </div>
          </div>

          <div className="mt-5">
            <Label htmlFor="streamer-search" className="text-zinc-300">
              Search streamers
            </Label>
            <Input
              id="streamer-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or email"
              className="mt-2 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
            />
          </div>

          <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {loadingUsers ? (
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading streamers...
              </div>
            ) : null}

            {!loadingUsers && visibleUsers.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-400">
                No streamer accounts found.
              </div>
            ) : null}

            {visibleUsers.map((user) => {
              const selected = selectedUser?.id === user.id

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUser(user)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all",
                    selected
                      ? "border-cyan-400/40 bg-cyan-400/12"
                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-900",
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-zinc-300">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{getDisplayName(user)}</p>
                    <p className="truncate text-sm text-zinc-500">{user.email}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      user.status === "active"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-amber-500/10 text-amber-200",
                    )}
                  >
                    {user.status || "active"}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-400/15 text-fuchsia-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Animation Details</h2>
              <p className="text-sm text-zinc-500">The overlay chooses the animation from the streamer&apos;s own setup.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <div>
              <Label htmlFor="display-name" className="text-zinc-300">
                Name shown on animation
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Example: BFlex"
                maxLength={80}
                className="mt-2 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <Label htmlFor="amount" className="text-zinc-300">
                Amount shown
              </Label>
              <Input
                id="amount"
                inputMode="numeric"
                value={amount}
                onChange={(event) => {
                  const raw = event.target.value.replace(/,/g, "")
                  if (raw && Number.isNaN(Number(raw))) return
                  setAmount(raw ? Number(raw).toLocaleString() : "")
                }}
                placeholder="25,000"
                className="mt-2 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-zinc-300">
                Message
              </Label>
              <Input
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional"
                maxLength={240}
                className="mt-2 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Preview Summary</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Streamer</span>
                <span className="truncate text-right font-medium text-white">
                  {selectedUser ? getDisplayName(selectedUser) : "Select a streamer"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Display name</span>
                <span className="truncate text-right font-medium text-white">
                  {displayName.trim() || "Name to show"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Amount</span>
                <span className="font-medium text-cyan-200">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={sendAnimation}
            disabled={!canSend}
            className="mt-6 h-12 w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90 disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending animation...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Animation
              </>
            )}
          </Button>
        </section>
      </div>
    </div>
  )
}

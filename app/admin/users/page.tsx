"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Check, RefreshCcw, ShieldPlus, Trash2, UserCog, UserPlus, UserRoundX, WalletCards } from "lucide-react"
import { adminRequest } from "@/lib/admin-client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AppUser } from "@/lib/user"
import { cn } from "@/lib/utils"

type UserRole = "creator" | "admin"
type UserStatus = "active" | "suspended" | "banned"
type UsersPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

type AdminUserListItem = {
  id: string
  name: string
  firstName?: string
  middleName?: string
  lastName?: string
  email: string
  role?: "creator" | "admin"
  status?: "active" | "suspended" | "banned"
  identity?: {
    hasBvn?: boolean
    hasNin?: boolean
    bvnLast4?: string
    ninLast4?: string
  }
  createdAt?: string
}

type UserDraft = {
  name: string
  firstName: string
  middleName: string
  lastName: string
  dateOfBirth: string
  email: string
  phoneNumber: string
  password: string
  role: UserRole
  status: UserStatus
  provisionVirtualAccount?: boolean
}

const emptyDraft: UserDraft = {
  name: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phoneNumber: "",
  password: "",
  role: "creator",
  status: "active",
  provisionVirtualAccount: false,
}
const PAYSTACK_ENABLED = String(process.env.NEXT_PUBLIC_PAYSTACK_ENABLED || "false").toLowerCase() === "true"

function getUserDisplayName(user: AppUser) {
  return [user.firstName || user.identity?.firstName, user.middleName || user.identity?.middleName, user.lastName || user.identity?.lastName]
    .filter(Boolean)
    .join(" ") || user.name
}

function getVerificationLabel(status?: string) {
  if (status === "verified") return "Verified"
  if (status === "failed") return "Failed"
  if (status === "skipped") return "Skipped"
  return "Not verified"
}

function getVerificationClass(status?: string) {
  if (status === "verified") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
  if (status === "failed") return "border-red-400/20 bg-red-400/10 text-red-200"
  return "border-zinc-700 bg-zinc-950 text-zinc-300"
}

function getVerificationTypesForRequest(type: "bvn" | "nin" | "both") {
  if (type === "bvn") return ["bvn"] as const
  if (type === "nin") return ["nin"] as const
  return ["bvn", "nin"] as const
}

function buildVerificationResult(payload: any, type: "bvn" | "nin" | "both") {
  if (typeof payload?.success === "boolean") {
    const mismatches = Array.isArray(payload?.mismatches) ? payload.mismatches : []
    const mismatchText = mismatches.length
      ? mismatches
          .map((item: any) => `${item?.field || "field"}: ${item?.message || item?.status || "NO_MATCH"}`)
          .join(" | ")
      : ""
    return {
      ok: payload.success === true,
      message:
        payload.success === true
          ? String(payload?.message || "Identity verification passed and saved.")
          : [String(payload?.message || "Identity verification failed."), mismatchText].filter(Boolean).join(" | "),
    }
  }

  const verification = payload?.verification || payload?.user?.identityVerification || {}
  const requestedTypes = getVerificationTypesForRequest(type)
  const failedTypes = requestedTypes.filter((item) => {
    const status = String(verification?.[item]?.status || "").toLowerCase()
    return status !== "verified"
  })

  if (!failedTypes.length) {
    return {
      ok: true,
      message:
        requestedTypes.length === 2
          ? "Monnify BVN and NIN verification passed and saved."
          : `Monnify ${requestedTypes[0].toUpperCase()} verification passed and saved.`,
    }
  }

  const details = failedTypes
    .map((item) => {
      const snapshot = verification?.[item] || {}
      const reason = String(snapshot.responseMessage || snapshot.matchStatus || "verification failed").trim()
      return `${item.toUpperCase()}: ${reason}`
    })
    .join(" | ")

  return {
    ok: false,
    message: `Verification completed but not validated. ${details}`,
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [usersPagination, setUsersPagination] = useState<UsersPagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [createDraft, setCreateDraft] = useState<UserDraft>(emptyDraft)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [selectedUserLoading, setSelectedUserLoading] = useState(false)
  const [selectedUserRefreshKey, setSelectedUserRefreshKey] = useState(0)
  const [editDraft, setEditDraft] = useState<UserDraft>(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")

  const loadUsers = async (targetPage = usersPagination.page, targetQuery = appliedSearchQuery) => {
    setLoading(true)
    setError("")

    try {
      const response = await adminRequest(
        `/admin/users?page=${targetPage}&limit=${usersPagination.limit}&q=${encodeURIComponent(targetQuery)}`,
      )
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not load users.")
      }

      const nextUsers = Array.isArray(data?.users) ? data.users : []
      const nextPagination = data?.pagination || {}
      const resolvedPage = Number(nextPagination.page) || targetPage || usersPagination.page
      const resolvedTotal = Number(nextPagination.total) || 0
      if (nextUsers.length === 0 && resolvedTotal > 0 && resolvedPage > 1) {
        setLoading(false)
        await loadUsers(resolvedPage - 1, targetQuery)
        return
      }

      setUsers(nextUsers)
      setUsersPagination((current) => ({
        page: resolvedPage || current.page,
        limit: Number(nextPagination.limit) || current.limit,
        total: resolvedTotal,
        totalPages: Math.max(1, Number(nextPagination.totalPages) || 1),
        hasPrevious: Boolean(nextPagination.hasPrevious),
        hasNext: Boolean(nextPagination.hasNext),
      }))
      const nextSelectedUserId =
        selectedUserId && nextUsers.some((user: AdminUserListItem) => user.id === selectedUserId)
          ? selectedUserId
          : nextUsers[0]?.id || ""
      setSelectedUserId(nextSelectedUserId)
      if (nextSelectedUserId && nextSelectedUserId === selectedUserId) {
        setSelectedUserRefreshKey((current) => current + 1)
      }
      if (!nextSelectedUserId) {
        setSelectedUser(null)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null)
      return
    }

    let cancelled = false

    const loadSelectedUser = async () => {
      setSelectedUserLoading(true)

      try {
        const response = await adminRequest(`/admin/users/${selectedUserId}`)
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || "Could not load selected user.")
        }

        if (!cancelled) {
          setSelectedUser((data?.user as AppUser) || null)
        }
      } catch (requestError) {
        if (!cancelled) {
          setSelectedUser(null)
          setError(
            requestError instanceof Error ? requestError.message : "Could not load selected user.",
          )
        }
      } finally {
        if (!cancelled) {
          setSelectedUserLoading(false)
        }
      }
    }

    void loadSelectedUser()

    return () => {
      cancelled = true
    }
  }, [selectedUserId, selectedUserRefreshKey])

  useEffect(() => {
    if (!selectedUser) {
      setEditDraft(emptyDraft)
      return
    }

    setEditDraft({
      name: getUserDisplayName(selectedUser),
      firstName: selectedUser.firstName || selectedUser.identity?.firstName || "",
      middleName: selectedUser.middleName || selectedUser.identity?.middleName || "",
      lastName: selectedUser.lastName || selectedUser.identity?.lastName || "",
      dateOfBirth: selectedUser.identity?.dateOfBirth?.slice(0, 10) || "",
      email: selectedUser.email,
      phoneNumber: selectedUser.phoneNumber || "",
      password: "",
      role: selectedUser.role || "creator",
      status: selectedUser.status || "active",
      provisionVirtualAccount: false,
    })
  }, [selectedUser])

  const createUser = async () => {
    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const response = await adminRequest("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not create user.")
      }

      setCreateDraft(emptyDraft)
      setMessage("User created successfully.")
      await loadUsers(1)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create user.")
    } finally {
      setSubmitting(false)
    }
  }

  const saveUser = async () => {
    if (!selectedUser) return

    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const response = await adminRequest(`/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name,
          email: editDraft.email,
          phoneNumber: editDraft.phoneNumber,
          dateOfBirth: editDraft.dateOfBirth,
          identity: {
            dateOfBirth: editDraft.dateOfBirth,
          },
          password: editDraft.password,
          role: editDraft.role,
          status: editDraft.status,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not update user.")
      }

      setMessage("User updated successfully.")
      await loadUsers(usersPagination.page)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update user.")
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (userId: string, status: UserStatus) => {
    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const response = await adminRequest(`/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not update user status.")
      }

      setMessage(`User status changed to ${status}.`)
      await loadUsers(usersPagination.page)
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Could not update user status.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const provisionVirtualAccount = async (userId: string) => {
    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const response = await adminRequest(`/admin/users/${userId}/virtual-account`, {
        method: "POST",
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not create a virtual account.")
      }

      setMessage("Virtual account provisioned successfully.")
      await loadUsers(usersPagination.page)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create a virtual account.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const verifyIdentity = async (userId: string, type: "bvn" | "nin" | "both") => {
    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const response = await adminRequest(`/admin/users/${userId}/identity-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, force: true }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not verify identity with Monnify.")
      }

      await loadUsers(usersPagination.page)
      const result = buildVerificationResult(data, type)
      if (result.ok) {
        setMessage(result.message)
      } else {
        setError(result.message)
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not verify identity with Monnify.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const deleteVirtualAccount = async (userId: string) => {
    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const response = await adminRequest(`/admin/users/${userId}/virtual-account`, {
        method: "DELETE",
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not delete the virtual account.")
      }

      const remoteDeallocation = data?.remoteDeallocation || {}

      if (remoteDeallocation.alreadyMissing) {
        setMessage("Virtual account removed from StreamTip. The provider had already deleted it.")
      } else if (remoteDeallocation.attempted) {
        setMessage("Virtual account deleted from the provider and removed from StreamTip.")
      } else {
        setMessage("Virtual account removed from StreamTip.")
      }

      await loadUsers(usersPagination.page)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the virtual account.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const deleteUser = async (userId: string) => {
    setSubmitting(true)
    setMessage("")
    setError("")

    try {
      const response = await adminRequest(`/admin/users/${userId}`, {
        method: "DELETE",
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not delete user.")
      }

      setMessage("User account deleted successfully.")
      if (selectedUserId === userId) {
        setSelectedUserId("")
      }
      await loadUsers(usersPagination.page)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not delete user.")
    } finally {
      setSubmitting(false)
    }
  }

  const inspectMigrationCandidates = async () => {
    setSubmitting(true)
    setError("")
    setMigrationMessage("")

    try {
      const response = await adminRequest("/admin/paystack/migration-candidates?limit=100")
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not load Paystack migration candidates.")
      }

      const configured = data?.paystackConfigured ? "Paystack is configured" : "Paystack is not configured"
      setMigrationMessage(`${data?.count || 0} creator(s) need a Paystack DVA. ${configured}.`)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load Paystack migration candidates.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const migratePaystackAccounts = async () => {
    setSubmitting(true)
    setError("")
    setMigrationMessage("")

    try {
      const response = await adminRequest("/admin/paystack/migrate-virtual-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not run Paystack migration.")
      }

      const migrated = (data?.results || []).filter((item: any) => item.status === "migrated").length
      const failed = (data?.results || []).filter((item: any) => item.status === "failed").length
      setMigrationMessage(`Paystack migration ran for ${data?.count || 0} creator(s): ${migrated} migrated, ${failed} failed.`)
      await loadUsers(usersPagination.page)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not run Paystack migration.")
    } finally {
      setSubmitting(false)
    }
  }

  const applyUserSearch = () => {
    const nextQuery = searchQuery.trim()
    setAppliedSearchQuery(nextQuery)
    void loadUsers(1, nextQuery)
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white">Manage Users</h1>
        <p className="text-zinc-400">
          Create users, change roles, suspend or ban accounts, and manage virtual account setup.
        </p>
      </div>

      {PAYSTACK_ENABLED ? (
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-white">Paystack DVA Migration</p>
            <p className="mt-1 text-sm text-cyan-100/80">
              Find creators without active Paystack dedicated virtual accounts and provision them in batches.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={inspectMigrationCandidates}
              disabled={submitting}
              className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Check Candidates
            </Button>
            <Button
              onClick={migratePaystackAccounts}
              disabled={submitting}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
            >
              Provision Paystack DVAs
            </Button>
          </div>
        </div>
        {migrationMessage ? <p className="mt-3 text-sm text-cyan-100">{migrationMessage}</p> : null}
      </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-cyan-200" />
            <h2 className="text-xl font-bold text-white">Create User</h2>
          </div>

          <div className="mt-5 space-y-4">
            <FormField label="Full name">
              <Input
                value={createDraft.name}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="border-zinc-700 bg-zinc-950/70 text-white"
              />
            </FormField>
            <FormField label="Email">
              <Input
                value={createDraft.email}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, email: event.target.value }))
                }
                className="border-zinc-700 bg-zinc-950/70 text-white"
              />
            </FormField>
            <FormField label="Phone number">
              <Input
                value={createDraft.phoneNumber}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, phoneNumber: event.target.value }))
                }
                placeholder="+2348012345678"
                className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
              />
            </FormField>
            <FormField label="Date of birth">
              <Input
                type="date"
                value={createDraft.dateOfBirth}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, dateOfBirth: event.target.value }))
                }
                className="border-zinc-700 bg-zinc-950/70 text-white"
              />
            </FormField>
            <FormField label="Temporary password">
              <Input
                type="password"
                value={createDraft.password}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, password: event.target.value }))
                }
                className="border-zinc-700 bg-zinc-950/70 text-white"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Role">
                <RoleSelect
                  value={createDraft.role}
                  onChange={(value) =>
                    setCreateDraft((current) => ({ ...current, role: value as UserRole }))
                  }
                />
              </FormField>
              <FormField label="Status">
                <StatusSelect
                  value={createDraft.status}
                  onChange={(value) =>
                    setCreateDraft((current) => ({ ...current, status: value as UserStatus }))
                  }
                />
              </FormField>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(createDraft.provisionVirtualAccount)}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    provisionVirtualAccount: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-cyan-500"
              />
                    Create virtual account after saving
            </label>

            <Button
              onClick={createUser}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
            >
              Create User
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <UserCog className="h-5 w-5 text-cyan-200" />
                <h2 className="text-xl font-bold text-white">User Directory</h2>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      applyUserSearch()
                    }
                  }}
                  placeholder="Search name or email"
                  className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600 sm:w-64"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyUserSearch}
                  disabled={loading}
                  className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                >
                  Search
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
                  Loading users...
                </div>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-all",
                      selectedUserId === user.id
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-white/10 bg-black/20 hover:bg-white/5",
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{user.name}</p>
                        <p className="truncate text-sm text-zinc-500">{user.email}</p>
                        <div className="mt-2 space-y-1 text-xs text-zinc-400">
                          <p>
                            BVN: {user.identity?.hasBvn ? `******${user.identity.bvnLast4 || ""}` : "Not submitted"}
                          </p>
                          <p>
                            NIN: {user.identity?.hasNin ? `******${user.identity.ninLast4 || ""}` : "Not submitted"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em]">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
                          {user.role || "creator"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1",
                            (user.status || "active") === "active" &&
                              "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                            (user.status || "active") === "suspended" &&
                              "border-amber-400/20 bg-amber-400/10 text-amber-200",
                            (user.status || "active") === "banned" &&
                              "border-red-400/20 bg-red-400/10 text-red-200",
                          )}
                        >
                          {user.status || "active"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
                  No users found on this page.
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-400">
                Page {usersPagination.page} of {usersPagination.totalPages} • {usersPagination.total.toLocaleString()} total users
                {appliedSearchQuery ? ` • Filter: "${appliedSearchQuery}"` : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || !usersPagination.hasPrevious}
                  onClick={() => void loadUsers(usersPagination.page - 1)}
                  className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || !usersPagination.hasNext}
                  onClick={() => void loadUsers(usersPagination.page + 1)}
                  className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <ShieldPlus className="h-5 w-5 text-cyan-200" />
              <h2 className="text-xl font-bold text-white">Selected User Controls</h2>
            </div>

            {selectedUserLoading ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
                Loading selected user...
              </div>
            ) : selectedUser ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Full name">
                    <Input
                      value={editDraft.name}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      className="border-zinc-700 bg-zinc-950/70 text-white"
                    />
                  </FormField>
                  <FormField label="Email">
                    <Input
                      value={editDraft.email}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, email: event.target.value }))
                      }
                      className="border-zinc-700 bg-zinc-950/70 text-white"
                    />
                  </FormField>
                  <FormField label="Phone number">
                    <Input
                      value={editDraft.phoneNumber}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, phoneNumber: event.target.value }))
                      }
                      placeholder="+2348012345678"
                      className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
                    />
                  </FormField>
                  <FormField label="Date of birth">
                    <Input
                      type="date"
                      value={editDraft.dateOfBirth}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, dateOfBirth: event.target.value }))
                      }
                      className="border-zinc-700 bg-zinc-950/70 text-white"
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="Role">
                    <RoleSelect
                      value={editDraft.role}
                      onChange={(value) =>
                        setEditDraft((current) => ({ ...current, role: value as UserRole }))
                      }
                    />
                  </FormField>
                  <FormField label="Status">
                    <StatusSelect
                      value={editDraft.status}
                      onChange={(value) =>
                        setEditDraft((current) => ({ ...current, status: value as UserStatus }))
                      }
                    />
                  </FormField>
                  <FormField label="Reset password">
                    <Input
                      type="password"
                      value={editDraft.password}
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="Optional new password"
                      className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-600"
                    />
                  </FormField>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-sm text-zinc-500">Virtual account</p>
                  <p className="mt-2 text-white">
                    {selectedUser.virtualAccount?.accountNumber || "No virtual account yet"}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedUser.virtualAccount?.bankName || "Provision one if needed."}
                    {selectedUser.virtualAccount?.provider ? ` / ${selectedUser.virtualAccount.provider}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Status: {selectedUser.virtualAccount?.status || "not_created"} · Assignment:{" "}
                    {selectedUser.virtualAccount?.assignmentStatus || "not_assigned"}
                  </p>
                  {selectedUser.virtualAccount?.paystackCustomerCode ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      Paystack customer: {selectedUser.virtualAccount.paystackCustomerCode}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-sm text-zinc-500">Monnify identity verification</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    DOB: {selectedUser.identity?.hasDateOfBirth ? selectedUser.identity.dateOfBirth?.slice(0, 10) : "missing"}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className={cn(
                      "rounded-xl border px-3 py-3 text-sm",
                      getVerificationClass(selectedUser.identityVerification?.bvn?.status),
                    )}>
                      <p className="font-medium">BVN</p>
                      <p className="mt-1 text-xs opacity-80">
                        {selectedUser.identity?.bvn
                          ? `Submitted: ${selectedUser.identity.bvn}`
                          : selectedUser.identity?.hasBvn
                            ? `Saved ending in ${selectedUser.identity.bvnLast4 || "****"}`
                            : "No BVN saved"}
                      </p>
                      <p className="mt-1 text-xs">{getVerificationLabel(selectedUser.identityVerification?.bvn?.status)}</p>
                    </div>
                    <div className={cn(
                      "rounded-xl border px-3 py-3 text-sm",
                      getVerificationClass(selectedUser.identityVerification?.nin?.status),
                    )}>
                      <p className="font-medium">NIN</p>
                      <p className="mt-1 text-xs opacity-80">
                        {selectedUser.identity?.nin
                          ? `Submitted: ${selectedUser.identity.nin}`
                          : selectedUser.identity?.hasNin
                            ? `Saved ending in ${selectedUser.identity.ninLast4 || "****"}`
                            : "No NIN saved"}
                      </p>
                      <p className="mt-1 text-xs">{getVerificationLabel(selectedUser.identityVerification?.nin?.status)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void verifyIdentity(selectedUser.id, "bvn")}
                      disabled={submitting || !selectedUser.identity?.hasBvn}
                      className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                    >
                      Verify BVN
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void verifyIdentity(selectedUser.id, "nin")}
                      disabled={submitting || !selectedUser.identity?.hasNin}
                      className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                    >
                      Verify NIN
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void verifyIdentity(selectedUser.id, "both")}
                      disabled={submitting || !selectedUser.identity?.hasBvn || !selectedUser.identity?.hasNin}
                      className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                    >
                      Verify Both
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={saveUser}
                    disabled={submitting}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Save User
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void updateStatus(selectedUser.id, "active")}
                    disabled={submitting}
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  >
                    Activate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void updateStatus(selectedUser.id, "suspended")}
                    disabled={submitting}
                    className="border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                  >
                    Suspend
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void updateStatus(selectedUser.id, "banned")}
                    disabled={submitting}
                    className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                  >
                    <UserRoundX className="mr-2 h-4 w-4" />
                    Ban
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void provisionVirtualAccount(selectedUser.id)}
                    disabled={
                      submitting ||
                      Boolean(
                        selectedUser.virtualAccount?.accountNumber &&
                          selectedUser.virtualAccount?.status === "active",
                      )
                    }
                    className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                  >
                    <WalletCards className="mr-2 h-4 w-4" />
                    Create Virtual Account
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={submitting || !selectedUser.virtualAccount?.accountNumber}
                        className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Virtual Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this virtual account?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This removes the saved account details from StreamTip. Legacy provider accounts are deallocated when the provider still supports it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void deleteVirtualAccount(selectedUser.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Yes, delete account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={submitting}
                        className="border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this user account?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          This will permanently remove {selectedUser.email} and their creator data.
                          Use this only when you are sure.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void deleteUser(selectedUser.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Yes, delete user
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
                Select a user from the list to edit, suspend, ban, promote to admin, or provision a virtual account.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-300">{label}</Label>
      {children}
    </div>
  )
}

function RoleSelect({
  value,
  onChange,
}: {
  value: UserRole
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-zinc-800 bg-zinc-900">
        <SelectItem value="creator" className="text-white focus:bg-zinc-800 focus:text-white">
          Creator
        </SelectItem>
        <SelectItem value="admin" className="text-white focus:bg-zinc-800 focus:text-white">
          Admin
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

function StatusSelect({
  value,
  onChange,
}: {
  value: UserStatus
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-zinc-800 bg-zinc-900">
        <SelectItem value="active" className="text-white focus:bg-zinc-800 focus:text-white">
          Active
        </SelectItem>
        <SelectItem value="suspended" className="text-white focus:bg-zinc-800 focus:text-white">
          Suspended
        </SelectItem>
        <SelectItem value="banned" className="text-white focus:bg-zinc-800 focus:text-white">
          Banned
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
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

type UserDraft = {
  name: string
  firstName: string
  middleName: string
  lastName: string
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
  email: "",
  phoneNumber: "",
  password: "",
  role: "creator",
  status: "active",
  provisionVirtualAccount: false,
}

function getUserDisplayName(user: AppUser) {
  return [user.firstName || user.identity?.firstName, user.middleName || user.identity?.middleName, user.lastName || user.identity?.lastName]
    .filter(Boolean)
    .join(" ") || user.name
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [createDraft, setCreateDraft] = useState<UserDraft>(emptyDraft)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [editDraft, setEditDraft] = useState<UserDraft>(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [migrationMessage, setMigrationMessage] = useState("")

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [selectedUserId, users],
  )

  const loadUsers = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await adminRequest("/admin/users")
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Could not load users.")
      }

      setUsers(data?.users || [])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

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
      await loadUsers()
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
      await loadUsers()
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
      await loadUsers()
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
      await loadUsers()
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

      await loadUsers()
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
      await loadUsers()
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
      await loadUsers()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not run Paystack migration.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-white">Manage Users</h1>
        <p className="text-zinc-400">
          Create users, change roles, suspend or ban accounts, and manage virtual account setup.
        </p>
      </div>

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
              Create Paystack DVA after saving
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
            <div className="flex items-center gap-3">
              <UserCog className="h-5 w-5 text-cyan-200" />
              <h2 className="text-xl font-bold text-white">User Directory</h2>
            </div>

            <div className="mt-5 grid gap-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-400">
                  Loading users...
                </div>
              ) : (
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
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <ShieldPlus className="h-5 w-5 text-cyan-200" />
              <h2 className="text-xl font-bold text-white">Selected User Controls</h2>
            </div>

            {selectedUser ? (
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
                        selectedUser.virtualAccount?.provider === "paystack" &&
                          selectedUser.virtualAccount?.accountNumber &&
                          selectedUser.virtualAccount?.status === "active",
                      )
                    }
                    className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                  >
                    <WalletCards className="mr-2 h-4 w-4" />
                    Create Paystack DVA
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

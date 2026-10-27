"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AuthMessage, AuthShell, authInputClass, authPrimaryButton } from "@/components/auth/auth-shell"
import { cn } from "@/lib/utils"
import { getApiBaseUrl } from "@/lib/runtime-config"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = String(searchParams.get("token") || "").trim()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingToken, setCheckingToken] = useState(Boolean(token))
  const [tokenValid, setTokenValid] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState(token ? "" : "This password reset link is missing a token.")

  useEffect(() => {
    let cancelled = false

    const validateToken = async () => {
      if (!token) {
        setCheckingToken(false)
        setTokenValid(false)
        return
      }

      setCheckingToken(true)
      setError("")

      try {
        const response = await fetch(
          `${getApiBaseUrl()}/auth/reset-password/validate?token=${encodeURIComponent(token)}`,
        )
        const payload = await response.json().catch(() => null)

        if (cancelled) {
          return
        }

        if (!response.ok || !payload?.valid) {
          setTokenValid(false)
          setError(payload?.error || "This password reset link has expired. Please request a new one.")
          return
        }

        setTokenValid(true)
      } catch {
        if (!cancelled) {
          setTokenValid(false)
          setError("Could not validate this password reset link. Please try again.")
        }
      } finally {
        if (!cancelled) {
          setCheckingToken(false)
        }
      }
    }

    void validateToken()

    return () => {
      cancelled = true
    }
  }, [token])

  const resetPassword = async () => {
    if (!token) {
      setError("This password reset link is missing a token.")
      return
    }

    if (password.length < 8) {
      setError("New password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Password confirmation does not match.")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not reset password.")
      }

      setPassword("")
      setConfirmPassword("")
      setTokenValid(false)
      setMessage(payload?.message || "Password reset successful. You can now log in.")
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reset password.",
      )
    } finally {
      setLoading(false)
    }
  }

  const formLocked = !tokenValid || checkingToken || Boolean(message)

  return (
    <AuthShell
      title="Choose a new password"
      description={
        checkingToken
          ? "Checking this reset link before you choose a new password."
          : "Reset links expire quickly. Pick a strong password and keep it private."
      }
      headerAction={
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded font-medium text-white underline-offset-4 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to login
        </Link>
      }
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!loading && !formLocked) void resetPassword()
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="reset-password" className="text-sm font-medium text-zinc-200">New password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <Input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={formLocked}
              placeholder="At least 8 characters"
              className={cn(authInputClass, "pl-10 pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-purple-400/60"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="reset-confirm" className="text-sm font-medium text-zinc-200">Confirm password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <Input
              id="reset-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={formLocked}
              placeholder="Repeat new password"
              className={cn(authInputClass, "pl-10")}
            />
          </div>
        </div>

        {message ? (
          <AuthMessage tone="success">
            {message}{" "}
            <Link href="/login" className="font-semibold text-white underline underline-offset-4">Log in</Link>
          </AuthMessage>
        ) : null}
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

        <button type="submit" disabled={loading || formLocked} aria-busy={loading || undefined} className={authPrimaryButton}>
          {loading || checkingToken ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {checkingToken ? "Checking link..." : loading ? "Resetting password..." : "Reset password"}
        </button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

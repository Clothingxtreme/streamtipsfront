"use client"

import Link from "next/link"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.16),transparent_30%),linear-gradient(180deg,#09090f,#101018)] px-6 py-12">
      <div className="mx-auto max-w-xl rounded-[32px] border border-zinc-800 bg-zinc-950/92 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="mt-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/10 px-4 py-2 text-sm text-purple-100">
            <ShieldCheck className="h-4 w-4" />
            Secure password reset
          </div>
          <h1 className="text-3xl font-black text-white">Choose a new password</h1>
          <p className="leading-7 text-zinc-500">
            {checkingToken
              ? "Checking this reset link before we let you choose a new password."
              : "Your reset link expires quickly, so pick a strong password and keep it private."}
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">New password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!tokenValid || checkingToken || Boolean(message)}
                placeholder="At least 8 characters"
                className="h-12 border-zinc-800 bg-zinc-900 pl-11 pr-11 text-white placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={!tokenValid || checkingToken || Boolean(message)}
                placeholder="Repeat new password"
                className="h-12 border-zinc-800 bg-zinc-900 pl-11 text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                <span>{message}</span>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-4 w-4 text-red-400" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}

          <Button
            onClick={resetPassword}
            disabled={loading || checkingToken || !tokenValid || Boolean(message)}
            className="h-12 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
          >
            {checkingToken ? "Checking link..." : loading ? "Resetting password..." : "Reset password"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, LoaderCircle, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AuthMessage, AuthShell, authInputClass, authPrimaryButton } from "@/components/auth/auth-shell"
import { cn } from "@/lib/utils"
import { getApiBaseUrl } from "@/lib/runtime-config"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const requestReset = async () => {
    if (loading) return
    if (!email.trim()) {
      setError("Enter the email address on your StreamTip account.")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not request a password reset.")
      }

      setMessage(
        payload?.message ||
          "If an account exists for that email, a password reset link has been sent.",
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not request a password reset.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your creator email and we'll send a secure reset link if the account exists."
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
          void requestReset()
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="forgot-email" className="text-sm font-medium text-zinc-200">Email address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="creator@example.com"
              className={cn(authInputClass, "pl-10")}
            />
          </div>
        </div>

        {message ? <AuthMessage tone="success">{message}</AuthMessage> : null}
        {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

        <button type="submit" disabled={loading} aria-busy={loading || undefined} className={authPrimaryButton}>
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {loading ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  )
}

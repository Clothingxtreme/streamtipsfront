"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getApiBaseUrl } from "@/lib/runtime-config"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const requestReset = async () => {
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_30%),linear-gradient(180deg,#09090f,#101018)] px-6 py-12">
      <div className="mx-auto max-w-xl rounded-[32px] border border-zinc-800 bg-zinc-950/92 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="mt-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
            <ShieldCheck className="h-4 w-4" />
            Password recovery
          </div>
          <h1 className="text-3xl font-black text-white">Reset your password</h1>
          <p className="leading-7 text-zinc-500">
            Enter your creator email and we&apos;ll send a secure reset link if the account exists.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="creator@example.com"
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
            onClick={requestReset}
            disabled={loading}
            className="h-12 w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
          >
            {loading ? "Sending reset link..." : "Send reset link"}
          </Button>
        </div>
      </div>
    </div>
  )
}

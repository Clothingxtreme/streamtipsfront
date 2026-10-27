"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AuthMessage, AuthShell, authInputClass, authPrimaryButton } from "@/components/auth/auth-shell"
import { cn } from "@/lib/utils"
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons"
import { useAuth } from "@/app/context/AuthContext"
import { getPostAuthRedirect } from "@/lib/onboarding"

export default function LoginPage() {
  const router = useRouter()
  const { login, socialLogin, isAuthenticated, isLoading, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getPostAuthRedirect(user))
    }
  }, [isAuthenticated, isLoading, router, user])

  const handleLogin = async () => {
    if (loading) return
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await login({
        email: email.trim(),
        password,
      })

      router.push(getPostAuthRedirect(result.user))
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not log in. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Log in"
      description="Welcome back. Use the email and password from your creator registration."
      headerAction={
        <>
          <span className="hidden sm:inline">New here? </span>
          <Link href="/register" className="rounded font-medium text-white underline-offset-4 hover:underline">
            Create account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <SocialAuthButtons
          disabled={loading}
          onGoogleCredential={async (credential) => {
            const result = await socialLogin("google", { credential })
            router.push(getPostAuthRedirect(result.user))
          }}
          onAppleToken={async (identityToken) => {
            const result = await socialLogin("apple", { identityToken })
            router.push(getPostAuthRedirect(result.user))
          }}
        />

        <div className="relative" aria-hidden>
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-zinc-950 px-3 text-zinc-500">or use email</span>
          </div>
        </div>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleLogin()
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-sm font-medium text-zinc-200">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="creator@example.com"
                className={cn(authInputClass, "pl-10")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="login-password" className="text-sm font-medium text-zinc-200">Password</label>
              <Link href="/forgot-password" className="rounded text-sm font-medium text-purple-200 hover:text-white">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
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

          {error ? <AuthMessage tone="error">{error}</AuthMessage> : null}

          <button type="submit" disabled={loading} aria-busy={loading || undefined} className={authPrimaryButton}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}

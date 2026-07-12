"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Landmark,
  Link2,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/app/context/AuthContext"
import { getApiBaseUrl } from "@/lib/runtime-config"
import { getPostAuthRedirect } from "@/lib/onboarding"
import { cn } from "@/lib/utils"

type StepId = "account" | "phone" | "policy" | "bvn" | "dob" | "names" | "payout"

type BankOption = {
  name: string
  code: string
}

const steps: Array<{ id: StepId; label: string }> = [
  { id: "account", label: "Account" },
  { id: "phone", label: "Phone" },
  { id: "policy", label: "Policy" },
  { id: "bvn", label: "BVN (Optional)" },
  { id: "dob", label: "DOB" },
  { id: "names", label: "Names" },
  { id: "payout", label: "Payout" },
]

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  }
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated, isLoading, user } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [bvn, setBvn] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [banks, setBanks] = useState<BankOption[]>([])
  const [bankName, setBankName] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [resolvingAccountName, setResolvingAccountName] = useState(false)
  const [acceptIdentityPolicy, setAcceptIdentityPolicy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const currentStep = steps[stepIndex]
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getPostAuthRedirect(user))
    }
  }, [isAuthenticated, isLoading, router, user])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("ref") || params.get("referral") || ""
    if (code) {
      setReferralCode(code.trim().toUpperCase())
    }
  }, [])

  useEffect(() => {
    void fetch(`${getApiBaseUrl()}/public/banks`)
      .then((response) => response.json())
      .then((payload) => {
        setBanks(Array.isArray(payload?.banks) ? payload.banks : [])
      })
      .catch(() => setBanks([]))
  }, [])

  useEffect(() => {
    if (!bankCode || accountNumber.length !== 10) {
      setAccountName("")
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setResolvingAccountName(true)

      try {
        const response = await fetch(`${getApiBaseUrl()}/public/bank-account-name-enquiry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankCode, accountNumber }),
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error || "Could not resolve account name.")
        }

        setAccountName(String(payload?.accountName || ""))
      } catch {
        if (!controller.signal.aborted) {
          setAccountName("")
        }
      } finally {
        if (!controller.signal.aborted) {
          setResolvingAccountName(false)
        }
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [accountNumber, bankCode])

  const validateCurrentStep = () => {
    if (currentStep.id === "account") {
      if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
        return "Email, password, and confirm password are required."
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Enter a valid email address."
      if (password.length < 8) return "Password must be at least 8 characters long."
      if (password !== confirmPassword) return "Passwords do not match."
    }

    if (currentStep.id === "policy" && !acceptIdentityPolicy) {
      return "Accept the identity policy before continuing."
    }

    if (currentStep.id === "phone" && !/^\+?\d{7,15}$/.test(phoneNumber.trim())) {
      return "Enter a valid phone number for Tier 1 KYC."
    }

    if (currentStep.id === "bvn" && bvn && !/^\d{11}$/.test(bvn)) {
      return "BVN must be 11 digits when provided."
    }

    if (currentStep.id === "dob" && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return "Enter your date of birth."
    }

    if (currentStep.id === "names" && (!firstName.trim() || !lastName.trim())) {
      return "Confirm your first and last name. Middle name is optional if you do not have one."
    }

    if (currentStep.id === "payout") {
      if (!bankCode || !bankName) return "Select your payout bank."
      if (accountNumber.length !== 10) return "Enter your 10-digit payout account number."
      if (!accountName.trim()) return "Wait for the bank account name to resolve."
    }

    return ""
  }

  const goNext = () => {
    const validationError = validateCurrentStep()
    if (validationError) {
      setError(validationError)
      return
    }

    setError("")
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1)
    }
  }

  const goBack = () => {
    setError("")
    setStepIndex((current) => Math.max(0, current - 1))
  }

  const handleRegister = async () => {
    const validationError = validateCurrentStep()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError("")

    try {
      const result = await register({
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim(),
        bvn,
        dateOfBirth,
        firstName: firstName.trim(),
        middleName: middleName.trim(),
        lastName: lastName.trim(),
        acceptIdentityPolicy,
        bankName,
        bankCode,
        accountNumber,
        referralCode: referralCode.trim().toUpperCase(),
      })

      setSuccess(
        result.warning ||
          "Account created successfully. Your creator dashboard is ready.",
      )
      const redirectTo =
        result.nextStep === "payout" ? "/dashboard/settings?complete=payout" : getPostAuthRedirect(result.user)
      window.setTimeout(() => router.push(redirectTo), 1200)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Registration failed. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }

  const autofillNames = () => {
    const guessed = splitFullName(email.split("@")[0].replace(/[._-]+/g, " "))
    if (!firstName) setFirstName(guessed.firstName)
    if (!middleName) setMiddleName(guessed.middleName)
    if (!lastName) setLastName(guessed.lastName)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_32%),linear-gradient(180deg,#09090f,#11111a)] px-6 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.28em] text-purple-300/80">Join StreamTip</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-white">
            Create your account first, then complete identity setup before going live.
          </h1>
          <p className="mt-4 leading-7 text-zinc-400">
            This flow keeps sign-up smooth. BVN is optional at signup and can be verified later from
            Settings before virtual-account provisioning. NIN is only required when upgrading tiers.
          </p>

          <div className="mt-8 space-y-3">
            <Info icon={ShieldCheck} title="Identity policy">
              If you provide BVN details, they must be accurate. Invalid identity details can lead
              to account restrictions.
            </Info>
            <Info icon={FileCheck2} title="Commercial note">
              StreamTip retains 20% of creator earnings as stated in the terms.
            </Info>
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/90 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Create creator account</h2>
            <p className="text-zinc-500">Step {stepIndex + 1} of {steps.length}: {currentStep.label}</p>
          </div>

          <div className="mt-6 grid grid-cols-8 gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "h-2 rounded-full",
                  index <= stepIndex ? "bg-purple-400" : "bg-zinc-800",
                )}
              />
            ))}
          </div>

          <div className="mt-8 min-h-[360px] space-y-5">
            {currentStep.id === "account" ? (
              <>
                <Field label="Email address">
                  <IconInput icon={Mail}>
                    <Input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="creator@example.com"
                      className="h-12 border-zinc-800 bg-zinc-900 pl-11 text-white placeholder:text-zinc-600"
                    />
                  </IconInput>
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Password">
                    <PasswordInput
                      value={password}
                      onChange={setPassword}
                      show={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                    />
                  </Field>
                  <Field label="Confirm password">
                    <PasswordInput
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      show={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((current) => !current)}
                    />
                  </Field>
                </div>

                <Field label="Referral code (optional)">
                  <IconInput icon={Link2}>
                    <Input
                      value={referralCode}
                      onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                      placeholder="CREATOR123"
                      className="h-12 border-zinc-800 bg-zinc-900 pl-11 text-white placeholder:text-zinc-600"
                    />
                  </IconInput>
                </Field>
              </>
            ) : null}

            {currentStep.id === "phone" ? (
              <Field label="Phone number">
                <IconInput icon={Phone}>
                  <Input
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(event) =>
                      setPhoneNumber(event.target.value.replace(/[^\d+]/g, "").slice(0, 15))
                    }
                    placeholder="08012345678"
                    className="h-12 border-zinc-800 bg-zinc-900 pl-11 text-white placeholder:text-zinc-600"
                  />
                </IconInput>
              </Field>
            ) : null}

            {currentStep.id === "policy" ? (
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
                <p className="font-semibold text-white">Creator identity policy</p>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Provide accurate identity details for KYC checks. You can sign up without BVN now,
                  but you must verify your BVN later before virtual-account generation.
                </p>
                <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={acceptIdentityPolicy}
                    onChange={(event) => setAcceptIdentityPolicy(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-purple-500"
                  />
                  I understand and accept this identity policy.
                </label>
              </div>
            ) : null}

            {currentStep.id === "bvn" ? (
              <Field label="Enter your BVN (optional)">
                <Input
                  inputMode="numeric"
                  value={bvn}
                  onChange={(event) => setBvn(event.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="11-digit BVN"
                  className="h-12 border-zinc-800 bg-zinc-900 text-white placeholder:text-zinc-600"
                />
              </Field>
            ) : null}

            {currentStep.id === "dob" ? (
              <Field label="Date of birth">
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="h-12 border-zinc-800 bg-zinc-900 text-white"
                />
              </Field>
            ) : null}

            {currentStep.id === "names" ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-zinc-400">
                    Confirm the name details that should match your BVN record (and NIN later during tier upgrades).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={autofillNames}
                    className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    Guess from email
                  </Button>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="First name">
                    <IconInput icon={User}>
                      <Input
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className="h-12 border-zinc-800 bg-zinc-900 pl-11 text-white"
                      />
                    </IconInput>
                  </Field>
                  <Field label="Middle name (optional)">
                    <Input
                      value={middleName}
                      onChange={(event) => setMiddleName(event.target.value)}
                      className="h-12 border-zinc-800 bg-zinc-900 text-white"
                    />
                  </Field>
                  <Field label="Last name">
                    <Input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      className="h-12 border-zinc-800 bg-zinc-900 text-white"
                    />
                  </Field>
                </div>
              </>
            ) : null}

            {currentStep.id === "payout" ? (
              <>
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
                  This bank account will be locked for withdrawals. The account name must match
                  your first and last name, plus your middle name if you provide one. If your legal
                  documents differ, contact support for manual verification.
                </div>

                <Field label="Payout bank">
                  <Select
                    value={bankCode}
                    onValueChange={(value) => {
                      const selectedBank = banks.find((bank) => bank.code === value)
                      setBankCode(value)
                      setBankName(selectedBank?.name || "")
                      setAccountName("")
                    }}
                  >
                    <SelectTrigger className="h-12 border-zinc-800 bg-zinc-900 text-white">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-zinc-500" />
                        <SelectValue placeholder={banks.length ? "Select bank" : "Loading banks..."} />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900">
                      {banks.map((bank) => (
                        <SelectItem
                          key={bank.code}
                          value={bank.code}
                          className="text-white focus:bg-zinc-800 focus:text-white"
                        >
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Payout account number">
                  <div className="relative">
                    <Landmark className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      inputMode="numeric"
                      value={accountNumber}
                      onChange={(event) => {
                        setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
                        setAccountName("")
                      }}
                      placeholder="10-digit account number"
                      className="h-12 border-zinc-800 bg-zinc-900 pl-11 text-white placeholder:text-zinc-600"
                    />
                  </div>
                </Field>

                <Field label="Resolved account name">
                  <div className="relative">
                    <Input
                      readOnly
                      value={accountName}
                      placeholder={
                        resolvingAccountName
                          ? "Resolving account name..."
                          : "Account name will appear automatically"
                      }
                      className="h-12 border-zinc-800 bg-zinc-900 pr-11 text-white placeholder:text-zinc-600"
                    />
                    {resolvingAccountName ? (
                      <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
                    ) : null}
                  </div>
                </Field>
              </>
            ) : null}

            {error ? (
              <Message tone="error" icon={XCircle}>{error}</Message>
            ) : null}
            {success ? (
              <Message tone="success" icon={CheckCircle2}>{success}</Message>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={stepIndex === 0 || loading}
              className="h-12 border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {stepIndex < steps.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                className="h-12 flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="h-12 flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
              >
                {loading ? "Creating account..." : "Finish sign up"}
              </Button>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm">
            <span className="text-zinc-400">Already have an account?</span>
            <Link href="/login" className="inline-flex items-center gap-2 font-medium text-white">
              Log in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      {children}
    </div>
  )
}

function IconInput({
  icon: Icon,
  children,
}: {
  icon: typeof Mail
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      {children}
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Minimum 8 characters"
        className="h-12 border-zinc-800 bg-zinc-900 pl-11 pr-11 text-white placeholder:text-zinc-600"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function Info({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 font-medium text-white">
        <Icon className="h-4 w-4 text-purple-300" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{children}</p>
    </div>
  )
}

function Message({
  tone,
  icon: Icon,
  children,
}: {
  tone: "error" | "success"
  icon: typeof XCircle
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 text-sm",
        tone === "error"
          ? "border-red-500/20 bg-red-500/10 text-red-200"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4", tone === "error" ? "text-red-400" : "text-emerald-400")} />
        <span>{children}</span>
      </div>
    </div>
  )
}

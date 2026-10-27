"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Landmark,
  LoaderCircle,
  Lock,
  Mail,
  Phone,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  UserRound,
  Wand2,
  XCircle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { BankCombobox, type BankOption } from "@/components/auth/bank-combobox"
import { useAuth } from "@/app/context/AuthContext"
import { getApiBaseUrl } from "@/lib/runtime-config"
import { getPostAuthRedirect } from "@/lib/onboarding"
import {
  CREATOR_NICKNAME_MAX_LENGTH,
  normalizeCreatorNickname,
  validateCreatorNickname,
} from "@/lib/nickname"
import { cn } from "@/lib/utils"

type StepId = "account" | "phone" | "policy" | "bvn" | "dob" | "names" | "payout"

type FieldId =
  | "nickname"
  | "email"
  | "password"
  | "confirmPassword"
  | "phoneNumber"
  | "acceptIdentityPolicy"
  | "bvn"
  | "dateOfBirth"
  | "firstName"
  | "lastName"
  | "bank"
  | "accountNumber"
  | "accountName"

type ValidationIssue = { message: string; field: FieldId }

type ResolveState = "idle" | "loading" | "success" | "error"

const steps: Array<{ id: StepId; label: string; title: string; description: string }> = [
  {
    id: "account",
    label: "Account",
    title: "Create your account",
    description: "Pick the name supporters will see, then your log-in details.",
  },
  {
    id: "phone",
    label: "Phone",
    title: "Add your phone number",
    description: "Required for Tier 1 KYC.",
  },
  {
    id: "policy",
    label: "Policy",
    title: "Creator identity policy",
    description: "Read and accept before continuing.",
  },
  {
    id: "bvn",
    label: "BVN",
    title: "Bank Verification Number",
    description: "Optional now. Verify it later in Settings before your virtual account is generated.",
  },
  {
    id: "dob",
    label: "Birth date",
    title: "Date of birth",
    description: "Use the date on your BVN record.",
  },
  {
    id: "names",
    label: "Name",
    title: "Your legal name",
    description: "Should match your BVN record (and NIN later during tier upgrades).",
  },
  {
    id: "payout",
    label: "Payout",
    title: "Payout account",
    description: "Where your withdrawals will be sent.",
  },
]

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  }
}

function todayIsoDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function formatIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

const inputClass =
  "h-11 rounded-xl border-white/10 bg-white/[0.03] text-white shadow-none placeholder:text-zinc-500 hover:border-white/20 focus-visible:border-purple-400/60 focus-visible:ring-purple-500/20 aria-invalid:border-red-400/60 aria-invalid:ring-[3px] aria-invalid:ring-red-500/15"

export default function RegisterPage() {
  const router = useRouter()
  const { register, isAuthenticated, isLoading, user } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [showReferral, setShowReferral] = useState(false)
  const [referralCheck, setReferralCheck] = useState<{
    status: "idle" | "checking" | "valid" | "invalid" | "error"
    code: string
    creatorName: string
  }>({ status: "idle", code: "", creatorName: "" })
  const [bvn, setBvn] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [banks, setBanks] = useState<BankOption[]>([])
  const [banksStatus, setBanksStatus] = useState<"loading" | "ready" | "error">("loading")
  const [banksAttempt, setBanksAttempt] = useState(0)
  const [bankName, setBankName] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [resolveState, setResolveState] = useState<ResolveState>("idle")
  const [resolveError, setResolveError] = useState("")
  const [resolveAttempt, setResolveAttempt] = useState(0)
  const [acceptIdentityPolicy, setAcceptIdentityPolicy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [errorField, setErrorField] = useState<FieldId | null>(null)
  const [success, setSuccess] = useState("")

  const submittingRef = useRef(false)
  const resolveRequestRef = useRef(0)
  const focusHeadingRef = useRef(false)

  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1
  const isLocked = loading || Boolean(success)

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
      setShowReferral(true)
    }
  }, [])

  // Confirms the referral code while the creator types. Sign-up never depends on this check;
  // the server resolves the code again (including older codes) when the account is created.
  useEffect(() => {
    const code = referralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
    if (code.length < 3) {
      setReferralCheck({ status: "idle", code: "", creatorName: "" })
      return
    }

    const controller = new AbortController()
    setReferralCheck({ status: "checking", code, creatorName: "" })
    const timer = window.setTimeout(() => {
      void fetch(`${getApiBaseUrl()}/public/referral/${encodeURIComponent(code)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json().catch(() => null)
          if (response.ok && payload?.valid) {
            setReferralCheck({ status: "valid", code, creatorName: String(payload.creatorName || "") })
          } else if (response.status === 404) {
            setReferralCheck({ status: "invalid", code, creatorName: "" })
          } else {
            setReferralCheck({ status: "error", code, creatorName: "" })
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return
          setReferralCheck({ status: "error", code, creatorName: "" })
        })
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [referralCode])

  useEffect(() => {
    let cancelled = false
    setBanksStatus("loading")

    void fetch(`${getApiBaseUrl()}/public/banks`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return
        if (Array.isArray(payload?.banks)) {
          setBanks(payload.banks)
          setBanksStatus("ready")
        } else {
          setBanks([])
          setBanksStatus("error")
        }
      })
      .catch(() => {
        if (cancelled) return
        setBanks([])
        setBanksStatus("error")
      })

    return () => {
      cancelled = true
    }
  }, [banksAttempt])

  // Resolve the account name whenever the bank or account number changes. Each run gets a request
  // id so a slow response for an older bank/account combination can never overwrite a newer one.
  useEffect(() => {
    const requestId = ++resolveRequestRef.current

    if (!bankCode || accountNumber.length !== 10) {
      setAccountName("")
      setResolveState("idle")
      setResolveError("")
      return
    }

    const controller = new AbortController()
    const isCurrent = () => !controller.signal.aborted && requestId === resolveRequestRef.current

    setAccountName("")
    setResolveState("loading")
    setResolveError("")

    const timer = window.setTimeout(async () => {
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
        if (!isCurrent()) return

        const resolvedName = String(payload?.accountName || "")
        setAccountName(resolvedName)
        if (resolvedName) {
          setResolveState("success")
        } else {
          setResolveState("error")
          setResolveError("No account name was returned for this account.")
        }
      } catch (requestError) {
        if (!isCurrent()) return
        setAccountName("")
        setResolveState("error")
        setResolveError(
          requestError instanceof TypeError
            ? "Couldn't reach the server. Check your connection and try again."
            : requestError instanceof Error && requestError.message
              ? requestError.message
              : "Could not resolve account name.",
        )
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [accountNumber, bankCode, resolveAttempt])

  // Clear the inline error as soon as the user edits something.
  useEffect(() => {
    setError("")
    setErrorField(null)
  }, [
    nickname,
    email,
    password,
    confirmPassword,
    phoneNumber,
    acceptIdentityPolicy,
    bvn,
    dateOfBirth,
    firstName,
    lastName,
    bankCode,
    accountNumber,
  ])

  const validateCurrentStep = (): ValidationIssue | null => {
    if (currentStep.id === "account") {
      const nicknameError = validateCreatorNickname(nickname)
      if (nicknameError) return { message: nicknameError, field: "nickname" }
      if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
        return {
          message: "Email, password, and confirm password are required.",
          field: !email.trim() ? "email" : !password.trim() ? "password" : "confirmPassword",
        }
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { message: "Enter a valid email address.", field: "email" }
      if (password.length < 8) return { message: "Password must be at least 8 characters long.", field: "password" }
      if (password !== confirmPassword) return { message: "Passwords do not match.", field: "confirmPassword" }
    }

    if (currentStep.id === "policy" && !acceptIdentityPolicy) {
      return { message: "Accept the identity policy before continuing.", field: "acceptIdentityPolicy" }
    }

    if (currentStep.id === "phone" && !/^\+?\d{7,15}$/.test(phoneNumber.trim())) {
      return { message: "Enter a valid phone number for Tier 1 KYC.", field: "phoneNumber" }
    }

    if (currentStep.id === "bvn" && bvn && !/^\d{11}$/.test(bvn)) {
      return { message: "BVN must be 11 digits when provided.", field: "bvn" }
    }

    if (currentStep.id === "dob" && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return { message: "Enter your date of birth.", field: "dateOfBirth" }
    }

    if (currentStep.id === "names" && (!firstName.trim() || !lastName.trim())) {
      return {
        message: "Confirm your first and last name. Middle name is optional if you do not have one.",
        field: !firstName.trim() ? "firstName" : "lastName",
      }
    }

    if (currentStep.id === "payout") {
      if (!bankCode || !bankName) return { message: "Select your payout bank.", field: "bank" }
      if (accountNumber.length !== 10) {
        return { message: "Enter your 10-digit payout account number.", field: "accountNumber" }
      }
      if (!accountName.trim()) {
        return {
          message:
            resolveState === "error"
              ? "We couldn't verify this account. Check the bank and account number, then try again."
              : "Wait for the bank account name to resolve.",
          field: "accountName",
        }
      }
    }

    return null
  }

  const showIssue = (issue: ValidationIssue) => {
    setError(issue.message)
    setErrorField(issue.field)
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`register-${issue.field}`)
      if (target instanceof HTMLElement && issue.field !== "accountName") target.focus()
    })
  }

  const goToStep = (nextIndex: number) => {
    setDirection(nextIndex > stepIndex ? 1 : -1)
    setError("")
    setErrorField(null)
    focusHeadingRef.current = true
    setStepIndex(nextIndex)
  }

  const goNext = () => {
    const issue = validateCurrentStep()
    if (issue) {
      showIssue(issue)
      return
    }
    if (stepIndex < steps.length - 1) goToStep(stepIndex + 1)
  }

  const goBack = () => {
    if (stepIndex > 0) goToStep(stepIndex - 1)
  }

  const handleRegister = async () => {
    if (submittingRef.current || success) return

    const issue = validateCurrentStep()
    if (issue) {
      showIssue(issue)
      return
    }

    submittingRef.current = true
    setLoading(true)
    setError("")
    setErrorField(null)

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
        nickname: normalizeCreatorNickname(nickname),
      })

      setSuccess(result.warning || "Account created successfully. Your creator dashboard is ready.")
      const redirectTo =
        result.nextStep === "payout" ? "/dashboard/settings?complete=payout" : getPostAuthRedirect(result.user)
      window.setTimeout(() => router.push(redirectTo), 1200)
    } catch (requestError) {
      submittingRef.current = false
      setError(requestError instanceof Error ? requestError.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLocked) return
    if (isLastStep) {
      void handleRegister()
    } else {
      goNext()
    }
  }

  const autofillNames = () => {
    const guessed = splitFullName(email.split("@")[0].replace(/[._-]+/g, " "))
    if (!firstName) setFirstName(guessed.firstName)
    if (!middleName) setMiddleName(guessed.middleName)
    if (!lastName) setLastName(guessed.lastName)
  }

  const headingRef = useCallback((node: HTMLHeadingElement | null) => {
    if (node && focusHeadingRef.current) {
      focusHeadingRef.current = false
      node.focus({ preventScroll: true })
    }
  }, [])

  const invalid = (field: FieldId) => errorField === field || undefined
  const maxBirthDate = useMemo(() => todayIsoDate(), [])
  const formattedBirthDate = formatIsoDate(dateOfBirth)
  const passwordLongEnough = password.length >= 8
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword

  const primaryLabel = isLastStep
    ? success
      ? "Redirecting…"
      : loading
        ? "Creating account…"
        : "Create account"
    : currentStep.id === "bvn" && !bvn
      ? "Skip for now"
      : "Continue"

  const motionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, x: direction * 18 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction * -18 },
        transition: { duration: 0.18, ease: "easeOut" as const },
      }

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#09090f] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(168,85,247,0.16),transparent_70%)]"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[34rem] flex-col px-4 pb-8 pt-5 sm:px-6 sm:pt-10">
        <header className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Sparkles className="h-[18px] w-[18px] text-white" aria-hidden />
            </span>
            <span className="text-base font-bold tracking-tight">StreamTips</span>
          </Link>
          <p className="text-sm text-zinc-400">
            <span className="hidden sm:inline">Have an account? </span>
            <Link
              href="/login"
              className="rounded font-medium text-white underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-purple-400/60"
            >
              Log in
            </Link>
          </p>
        </header>

        <section
          aria-labelledby="register-step-title"
          className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.4)] sm:p-7"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-purple-300/90">Creator sign-up</p>
            <p className="text-xs tabular-nums text-zinc-500">
              Step {stepIndex + 1} of {steps.length}
            </p>
          </div>

          <StepProgress currentIndex={stepIndex} onSelect={isLocked ? undefined : goToStep} />

          <form noValidate onSubmit={handleSubmit} className="mt-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={currentStep.id} {...motionProps}>
                <div className="mb-5">
                  <h1
                    id="register-step-title"
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-xl font-semibold tracking-tight text-white outline-none sm:text-[22px]"
                  >
                    {currentStep.title}
                  </h1>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{currentStep.description}</p>
                </div>

                <div className="space-y-4">
                  {currentStep.id === "account" ? (
                    <>
                      <Field
                        id="register-nickname"
                        label="Creator nickname"
                        hint={
                          <span className="flex w-full justify-between gap-3">
                            <span>Shown to supporters and used for your referral code. You can change it later in Settings.</span>
                            <span className="shrink-0 tabular-nums">
                              {Array.from(nickname).length}/{CREATOR_NICKNAME_MAX_LENGTH}
                            </span>
                          </span>
                        }
                      >
                        <IconInput icon={UserRound}>
                          <Input
                            id="register-nickname"
                            aria-describedby="register-nickname-hint"
                            autoComplete="nickname"
                            value={nickname}
                            onChange={(event) => setNickname(event.target.value)}
                            onBlur={() => setNickname((current) => normalizeCreatorNickname(current))}
                            maxLength={CREATOR_NICKNAME_MAX_LENGTH * 2}
                            placeholder="e.g. AdaPlays"
                            aria-invalid={invalid("nickname")}
                            className={cn(inputClass, "pl-10")}
                          />
                        </IconInput>
                      </Field>

                      <Field id="register-email" label="Email address">
                        <IconInput icon={Mail}>
                          <Input
                            id="register-email"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="creator@example.com"
                            aria-invalid={invalid("email")}
                            className={cn(inputClass, "pl-10")}
                          />
                        </IconInput>
                      </Field>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          id="register-password"
                          label="Password"
                          hint={
                            <HintCheck ok={passwordLongEnough}>At least 8 characters</HintCheck>
                          }
                        >
                          <PasswordInput
                            id="register-password"
                            autoComplete="new-password"
                            value={password}
                            onChange={setPassword}
                            show={showPassword}
                            onToggle={() => setShowPassword((current) => !current)}
                            invalid={invalid("password")}
                          />
                        </Field>
                        <Field
                          id="register-confirmPassword"
                          label="Confirm password"
                          hint={
                            confirmPassword ? (
                              <HintCheck ok={passwordsMatch} failTone>
                                {passwordsMatch ? "Passwords match" : "Passwords don't match yet"}
                              </HintCheck>
                            ) : (
                              <span>Re-enter your password</span>
                            )
                          }
                        >
                          <PasswordInput
                            id="register-confirmPassword"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={setConfirmPassword}
                            show={showConfirmPassword}
                            onToggle={() => setShowConfirmPassword((current) => !current)}
                            invalid={invalid("confirmPassword")}
                          />
                        </Field>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.015]">
                        <button
                          type="button"
                          onClick={() => setShowReferral((current) => !current)}
                          aria-expanded={showReferral}
                          aria-controls="register-referral-panel"
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm text-zinc-300 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-purple-400/60"
                        >
                          <span className="flex items-center gap-2">
                            <Ticket className="h-4 w-4 text-zinc-500" aria-hidden />
                            Have a referral code?
                            {referralCode && !showReferral ? (
                              <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 font-mono text-xs text-purple-200">
                                {referralCode}
                              </span>
                            ) : null}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-zinc-500 transition-transform motion-reduce:transition-none",
                              showReferral && "rotate-180",
                            )}
                            aria-hidden
                          />
                        </button>
                        {showReferral ? (
                          <div id="register-referral-panel" className="px-3.5 pb-3.5">
                            <label htmlFor="register-referralCode" className="sr-only">
                              Referral code (optional)
                            </label>
                            <Input
                              id="register-referralCode"
                              value={referralCode}
                              onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                              placeholder="CREATOR123"
                              autoComplete="off"
                              aria-describedby="register-referral-status"
                              className={cn(inputClass, "font-mono uppercase tracking-wide")}
                            />
                            <p
                              id="register-referral-status"
                              aria-live="polite"
                              className={cn(
                                "mt-1.5 min-h-4 text-xs",
                                referralCheck.status === "valid"
                                  ? "text-emerald-300"
                                  : referralCheck.status === "invalid"
                                    ? "text-amber-300"
                                    : "text-zinc-500",
                              )}
                            >
                              {referralCheck.status === "checking"
                                ? "Checking code…"
                                : referralCheck.status === "valid"
                                  ? referralCheck.creatorName
                                    ? `Referred by ${referralCheck.creatorName}`
                                    : "Referral code found."
                                  : referralCheck.status === "invalid"
                                    ? "We couldn't find this code. You can still sign up without it."
                                    : referralCheck.status === "error"
                                      ? "Couldn't check the code right now. It will be checked when you sign up."
                                      : ""}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {currentStep.id === "phone" ? (
                    <Field
                      id="register-phoneNumber"
                      label="Phone number"
                      hint="Digits only. You can include a + country code, e.g. +2348012345678."
                    >
                      <IconInput icon={Phone}>
                        <Input
                          id="register-phoneNumber"
                          aria-describedby="register-phoneNumber-hint"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phoneNumber}
                          onChange={(event) =>
                            setPhoneNumber(event.target.value.replace(/[^\d+]/g, "").slice(0, 15))
                          }
                          placeholder="08012345678"
                          aria-invalid={invalid("phoneNumber")}
                          className={cn(inputClass, "pl-10 tabular-nums")}
                        />
                      </IconInput>
                    </Field>
                  ) : null}

                  {currentStep.id === "policy" ? (
                    <>
                      <ul className="space-y-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-300">
                        <PolicyPoint>
                          Provide accurate identity details for KYC checks. You can sign up without BVN now,
                          but you must verify your BVN later before virtual-account generation.
                        </PolicyPoint>
                        <PolicyPoint>
                          If you provide BVN details, they must be accurate. Invalid identity details can lead
                          to account restrictions.
                        </PolicyPoint>
                        <PolicyPoint>NIN is only required when upgrading tiers.</PolicyPoint>
                        <PolicyPoint>
                          StreamTip retains 10% of creator earnings as stated in the{" "}
                          <Link
                            href="/terms"
                            target="_blank"
                            className="text-white underline underline-offset-4 hover:text-purple-200"
                          >
                            terms
                          </Link>
                          .
                        </PolicyPoint>
                      </ul>
                      <label
                        htmlFor="register-acceptIdentityPolicy"
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors",
                          acceptIdentityPolicy
                            ? "border-purple-400/40 bg-purple-500/[0.08] text-white"
                            : "border-white/10 bg-white/[0.02] text-zinc-200 hover:border-white/20",
                          errorField === "acceptIdentityPolicy" && "border-red-400/60",
                        )}
                      >
                        <Checkbox
                          id="register-acceptIdentityPolicy"
                          checked={acceptIdentityPolicy}
                          onCheckedChange={(checked) => setAcceptIdentityPolicy(checked === true)}
                          aria-invalid={invalid("acceptIdentityPolicy")}
                          className="mt-0.5 size-[18px] border-white/25 bg-transparent data-[state=checked]:border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:text-white focus-visible:ring-purple-500/30"
                        />
                        I understand and accept this identity policy.
                      </label>
                    </>
                  ) : null}

                  {currentStep.id === "bvn" ? (
                    <Field
                      id="register-bvn"
                      label="BVN"
                      optional
                      hint={
                        <span className="flex w-full justify-between gap-3">
                          <span>Leave blank to skip. You can add it later in Settings.</span>
                          <span className="tabular-nums">{bvn.length}/11</span>
                        </span>
                      }
                    >
                      <IconInput icon={ShieldCheck}>
                        <Input
                          id="register-bvn"
                          aria-describedby="register-bvn-hint"
                          inputMode="numeric"
                          autoComplete="off"
                          value={bvn}
                          onChange={(event) => setBvn(event.target.value.replace(/\D/g, "").slice(0, 11))}
                          placeholder="11-digit BVN"
                          aria-invalid={invalid("bvn")}
                          className={cn(inputClass, "pl-10 tabular-nums tracking-wide")}
                        />
                      </IconInput>
                    </Field>
                  ) : null}

                  {currentStep.id === "dob" ? (
                    <Field
                      id="register-dateOfBirth"
                      label="Date of birth"
                      hint={formattedBirthDate ? `Selected: ${formattedBirthDate}` : "Pick a date or type it in."}
                    >
                      <Input
                        id="register-dateOfBirth"
                        aria-describedby="register-dateOfBirth-hint"
                        type="date"
                        autoComplete="bday"
                        max={maxBirthDate}
                        value={dateOfBirth}
                        onChange={(event) => setDateOfBirth(event.target.value)}
                        aria-invalid={invalid("dateOfBirth")}
                        className={cn(inputClass, "[color-scheme:dark] sm:max-w-[16rem]")}
                      />
                    </Field>
                  ) : null}

                  {currentStep.id === "names" ? (
                    <>
                      <button
                        type="button"
                        onClick={autofillNames}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-zinc-200 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-purple-400/60"
                      >
                        <Wand2 className="h-4 w-4 text-purple-300" aria-hidden />
                        Guess from email
                      </button>
                      <div className="grid items-start gap-4 sm:grid-cols-3">
                        <Field id="register-firstName" label="First name">
                          <IconInput icon={User}>
                            <Input
                              id="register-firstName"
                              autoComplete="given-name"
                              value={firstName}
                              onChange={(event) => setFirstName(event.target.value)}
                              aria-invalid={invalid("firstName")}
                              className={cn(inputClass, "pl-10")}
                            />
                          </IconInput>
                        </Field>
                        <Field
                          id="register-middleName"
                          label="Middle name"
                          optional
                          hint="Leave blank if you don't have one."
                        >
                          <Input
                            id="register-middleName"
                            aria-describedby="register-middleName-hint"
                            autoComplete="additional-name"
                            value={middleName}
                            onChange={(event) => setMiddleName(event.target.value)}
                            className={inputClass}
                          />
                        </Field>
                        <Field id="register-lastName" label="Last name">
                          <Input
                            id="register-lastName"
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            aria-invalid={invalid("lastName")}
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </>
                  ) : null}

                  {currentStep.id === "payout" ? (
                    <>
                      <p className="flex gap-2.5 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-cyan-100/90">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                        <span>
                          This account will be locked for withdrawals. Its name must match your first and last
                          name, plus your middle name if you provided one. If your legal documents differ, contact
                          support for manual verification.
                        </span>
                      </p>

                      <Field id="register-bank" label="Bank">
                        <BankCombobox
                          id="register-bank"
                          banks={banks}
                          status={banksStatus}
                          value={bankCode}
                          invalid={Boolean(invalid("bank"))}
                          describedBy="register-accountName"
                          disabled={isLocked}
                          onRetry={() => setBanksAttempt((current) => current + 1)}
                          onChange={(bank) => {
                            setBankCode(bank.code)
                            setBankName(bank.name)
                            setAccountName("")
                          }}
                        />
                      </Field>

                      <Field
                        id="register-accountNumber"
                        label="Account number"
                        hint={
                          <span className="flex w-full justify-end tabular-nums">{accountNumber.length}/10</span>
                        }
                      >
                        <IconInput icon={Landmark}>
                          <Input
                            id="register-accountNumber"
                            aria-describedby="register-accountNumber-hint"
                            inputMode="numeric"
                            autoComplete="off"
                            value={accountNumber}
                            disabled={isLocked}
                            onChange={(event) => {
                              setAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
                              setAccountName("")
                            }}
                            placeholder="10-digit account number"
                            aria-invalid={invalid("accountNumber")}
                            className={cn(inputClass, "pl-10 tabular-nums tracking-wide")}
                          />
                        </IconInput>
                      </Field>

                      <AccountNameStatus
                        state={resolveState}
                        accountName={accountName}
                        errorMessage={resolveError}
                        hasBank={Boolean(bankCode)}
                        highlight={errorField === "accountName"}
                        onRetry={() => setResolveAttempt((current) => current + 1)}
                      />
                    </>
                  ) : null}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="space-y-3 [&:not(:empty)]:mt-4">
              {error ? (
                <Message tone="error" icon={XCircle}>
                  {error}
                </Message>
              ) : null}
              {success ? (
                <Message tone="success" icon={CheckCircle2}>
                  {success}
                </Message>
              ) : null}
            </div>

            <div className="mt-6 flex items-center gap-3">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isLocked}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 text-sm font-medium text-zinc-200 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-white focus-visible:ring-[3px] focus-visible:ring-purple-500/30 disabled:pointer-events-none disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </button>
              ) : null}
              <button
                type="submit"
                disabled={isLocked}
                aria-busy={loading || undefined}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(217,70,239,0.55)] outline-none transition-[filter,transform] hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-pink-400/40 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:brightness-100 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {primaryLabel}
                {!isLastStep && !loading ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
              </button>
            </div>
          </form>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>Your details are sent securely to StreamTips.</span>
          <Link href="/terms" className="hover:text-zinc-300">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-zinc-300">
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  )
}

function StepProgress({
  currentIndex,
  onSelect,
}: {
  currentIndex: number
  onSelect?: (index: number) => void
}) {
  return (
    <nav aria-label="Sign-up progress" className="mt-4">
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          const canSelect = Boolean(onSelect) && isDone
          return (
            <li key={step.id} className="relative flex flex-1 flex-col items-center">
              {index > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-1/2 top-3.5 h-px w-full -translate-y-1/2",
                    index <= currentIndex ? "bg-gradient-to-r from-purple-500/70 to-pink-500/70" : "bg-white/10",
                  )}
                />
              ) : null}
              <button
                type="button"
                disabled={!canSelect}
                onClick={canSelect ? () => onSelect?.(index) : undefined}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${isDone ? " (completed)" : isCurrent ? " (current)" : ""}`}
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-purple-500/40 disabled:cursor-default",
                  isDone && "border-transparent bg-purple-500/90 text-white hover:bg-purple-400",
                  isCurrent && "border-transparent bg-gradient-to-br from-purple-500 to-pink-500 text-white ring-4 ring-purple-500/15",
                  !isDone && !isCurrent && "border-white/10 bg-zinc-950 text-zinc-500",
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : index + 1}
              </button>
              <span
                aria-hidden
                className={cn(
                  "mt-1.5 hidden whitespace-nowrap text-[11px] sm:block",
                  isCurrent ? "font-medium text-white" : isDone ? "text-zinc-400" : "text-zinc-600",
                )}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-center text-xs text-zinc-400 sm:hidden" aria-hidden>
        {steps[currentIndex].label}
      </p>
    </nav>
  )
}

function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-zinc-200">
        {label}
        {optional ? (
          <span className="rounded-md bg-white/[0.06] px-1.5 py-px text-[11px] font-normal text-zinc-400">
            Optional
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <div id={`${id}-hint`} className="flex text-xs leading-relaxed text-zinc-500">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

function HintCheck({ ok, failTone, children }: { ok: boolean; failTone?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors",
        ok ? "text-emerald-400" : failTone ? "text-amber-300/90" : "text-zinc-500",
      )}
    >
      {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : <span className="size-1 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

function IconInput({ icon: Icon, children }: { icon: typeof Mail; children: ReactNode }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
      {children}
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  invalid,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
  invalid?: boolean
  autoComplete?: string
}) {
  const describedBy = `${id}-hint`
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="••••••••"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={cn(inputClass, "pl-10 pr-11")}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-purple-400/60"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function PolicyPoint({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-300" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

function AccountNameStatus({
  state,
  accountName,
  errorMessage,
  hasBank,
  highlight,
  onRetry,
}: {
  state: ResolveState
  accountName: string
  errorMessage: string
  hasBank: boolean
  highlight: boolean
  onRetry: () => void
}) {
  return (
    <div
      id="register-accountName"
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[3.25rem] items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
        state === "success" && "border-emerald-400/25 bg-emerald-500/[0.07]",
        state === "error" && "border-red-400/25 bg-red-500/[0.06]",
        (state === "idle" || state === "loading") && "border-dashed border-white/10 bg-transparent",
        highlight && state !== "success" && "border-red-400/60",
      )}
    >
      {state === "loading" ? (
        <>
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-zinc-400" aria-hidden />
          <span className="text-zinc-400">Verifying account name…</span>
        </>
      ) : null}
      {state === "success" ? (
        <>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Account name</p>
            <p className="truncate font-medium text-white">{accountName}</p>
          </div>
        </>
      ) : null}
      {state === "error" ? (
        <>
          <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
          <span className="min-w-0 flex-1 text-red-200">{errorMessage || "Could not resolve account name."}</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-purple-400/60"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            Retry
          </button>
        </>
      ) : null}
      {state === "idle" ? (
        <span className="text-zinc-500">
          {hasBank
            ? "Enter your 10-digit account number and we'll confirm the account name."
            : "Choose your bank and enter your account number to confirm the account name."}
        </span>
      ) : null}
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
  children: ReactNode
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        tone === "error"
          ? "border-red-400/20 bg-red-500/[0.08] text-red-200"
          : "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200",
      )}
    >
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "error" ? "text-red-400" : "text-emerald-400")}
        aria-hidden
      />
      <span>{children}</span>
    </div>
  )
}

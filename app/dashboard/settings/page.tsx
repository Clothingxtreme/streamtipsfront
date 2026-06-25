"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ElementType } from "react"
import {
  AlertTriangle,
  AtSign,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Landmark,
  Link2,
  LoaderCircle,
  Mail,
  Phone,
  RadioTower,
  Save,
  Sparkles,
  User,
  Volume2,
  Wallet,
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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useAppPreferences } from "@/app/context/AppPreferencesContext"
import { useAuth } from "@/app/context/AuthContext"
import { useOverlayCustomization } from "@/app/context/OverlayCustomizationContext"
import { useOverlaySettings } from "@/app/context/OverlaySettingsContext"
import { OverlayShowcaseSettings } from "@/components/dashboard/overlay-showcase-settings"
import { HelpTip } from "@/components/help-tip"
import { giftPackThemes } from "@/lib/gifts"
import { authRequest } from "@/lib/auth-client"
import { STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT } from "@/hooks/use-onboarding-tour"
import { cn } from "@/lib/utils"
import type { AppPreferences } from "@/lib/app-preferences"
import type { OverlaySettingId } from "@/lib/overlay-settings"
import type { AppUser } from "@/lib/user"

type ProfileForm = {
  firstName: string
  middleName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  profileImage: string
  socialPlatform: string
  socialHandle: string
  socialProfileUrl: string
  socialLiveUrl: string
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type KycForm = {
  bvn: string
  nin: string
}

type BankOption = {
  name: string
  code: string
}

type PayoutProfileForm = {
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
}

type PayoutChangeRequestForm = PayoutProfileForm & {
  supportNote: string
  proofSummary: string
}

type SaveState = "idle" | "saving" | "saved" | "error"

const NOTIFICATION_SETTINGS: Array<{
  id: keyof Pick<
    AppPreferences,
    "desktopNotifications" | "donationNotifications" | "payoutNotifications" | "notificationSounds"
  >
  label: string
  description: string
  icon: ElementType
}> = [
  {
    id: "desktopNotifications",
    label: "Desktop Notifications",
    description: "Show browser alerts for supported donation and payout events.",
    icon: Bell,
  },
  {
    id: "donationNotifications",
    label: "Donation Alerts",
    description: "Trigger notifications whenever a new donation arrives.",
    icon: Sparkles,
  },
  {
    id: "payoutNotifications",
    label: "Payout Alerts",
    description: "Keep payout status and withdrawal completion alerts turned on.",
    icon: Wallet,
  },
  {
    id: "notificationSounds",
    label: "Notification Sounds",
    description: "Play the configured browser sounds for donations and payouts.",
    icon: Volume2,
  },
]

const OVERLAY_SETTINGS: Array<{
  id: OverlaySettingId
  label: string
  description: string
  icon: ElementType
}> = [
  {
    id: "animations",
    label: "Donation Animations",
    description: "Show animated overlay alerts for incoming donations.",
    icon: Sparkles,
  },
  {
    id: "sounds",
    label: "Overlay Sounds",
    description: "Play overlay audio whenever donation alerts appear on stream.",
    icon: Volume2,
  },
  {
    id: "notifications",
    label: "Overlay Desktop Alerts",
    description: "Mirror overlay events to your desktop for extra visibility.",
    icon: Bell,
  },
  {
    id: "preview",
    label: "Preview Mode",
    description: "Run sample donation events in private overlay preview sessions only.",
    icon: Eye,
  },
]

function formatMemberDate(value?: string) {
  if (!value) return "Not available yet"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Not available yet"
  }

  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function getUserNameParts(user?: AppUser | null) {
  return {
    firstName: user?.firstName || user?.identity?.firstName || "",
    middleName: user?.middleName || user?.identity?.middleName || "",
    lastName: user?.lastName || user?.identity?.lastName || "",
  }
}

function getVerificationLabel(status?: string) {
  if (status === "verified") return "Verified by Monnify"
  if (status === "failed") return "Verification failed"
  if (status === "skipped") return "Skipped"
  return "Not verified"
}

function getVerificationClass(status?: string) {
  if (status === "verified") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
  if (status === "failed") return "border-red-500/20 bg-red-500/10 text-red-200"
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { preferences, updatePreference } = useAppPreferences()
  const { customization, updateCustomization } = useOverlayCustomization()
  const { settings: overlaySettings, updateSetting } = useOverlaySettings()
  const [profile, setProfile] = useState<ProfileForm>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    profileImage: "",
    socialPlatform: "",
    socialHandle: "",
    socialProfileUrl: "",
    socialLiveUrl: "",
  })
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [kycForm, setKycForm] = useState<KycForm>({
    bvn: "",
    nin: "",
  })
  const [banks, setBanks] = useState<BankOption[]>([])
  const [payoutForm, setPayoutForm] = useState<PayoutProfileForm>({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  })
  const [payoutChangeForm, setPayoutChangeForm] = useState<PayoutChangeRequestForm>({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
    supportNote: "",
    proofSummary: "",
  })
  const [payoutState, setPayoutState] = useState<SaveState>("idle")
  const [payoutMessage, setPayoutMessage] = useState("")
  const [resolvingPayoutName, setResolvingPayoutName] = useState(false)
  const [resolvingChangeName, setResolvingChangeName] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [passwordState, setPasswordState] = useState<SaveState>("idle")
  const [profileMessage, setProfileMessage] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [continuePayoutSetup, setContinuePayoutSetup] = useState(false)
  const kycHelpText =
    "BVN and NIN are verified by Monnify on the backend. We only send them to the backend for account and KYC checks."

  useEffect(() => {
    setContinuePayoutSetup(new URLSearchParams(window.location.search).get("complete") === "payout")
  }, [])

  useEffect(() => {
    const nameParts = getUserNameParts(user)
    setProfile({
      firstName: nameParts.firstName,
      middleName: nameParts.middleName,
      lastName: nameParts.lastName,
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      dateOfBirth: user?.identity?.dateOfBirth?.slice(0, 10) || "",
      profileImage: user?.profileImage || "",
      socialPlatform: user?.socialProfile?.platform || "",
      socialHandle: user?.socialProfile?.handle || "",
      socialProfileUrl: user?.socialProfile?.profileUrl || "",
      socialLiveUrl: user?.socialProfile?.liveUrl || "",
    })
    setIsLoadingUser(false)
  }, [user])

  useEffect(() => {
    void authRequest("/banks")
      .then((response) => response.json())
      .then((payload) => setBanks(Array.isArray(payload?.banks) ? payload.banks : []))
      .catch(() => setBanks([]))
  }, [])

  useEffect(() => {
    if (!payoutForm.bankCode || payoutForm.accountNumber.length !== 10) {
      setPayoutForm((current) => ({ ...current, accountName: "" }))
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setResolvingPayoutName(true)

      try {
        const response = await authRequest("/bank-account-name-enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankCode: payoutForm.bankCode,
            accountNumber: payoutForm.accountNumber,
          }),
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error || "Could not resolve account name.")
        }

        setPayoutForm((current) => ({
          ...current,
          accountName: String(payload?.accountName || ""),
        }))
      } catch {
        if (!controller.signal.aborted) {
          setPayoutForm((current) => ({ ...current, accountName: "" }))
        }
      } finally {
        if (!controller.signal.aborted) {
          setResolvingPayoutName(false)
        }
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [payoutForm.accountNumber, payoutForm.bankCode])

  useEffect(() => {
    if (!payoutChangeForm.bankCode || payoutChangeForm.accountNumber.length !== 10) {
      setPayoutChangeForm((current) => ({ ...current, accountName: "" }))
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setResolvingChangeName(true)

      try {
        const response = await authRequest("/bank-account-name-enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankCode: payoutChangeForm.bankCode,
            accountNumber: payoutChangeForm.accountNumber,
          }),
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error || "Could not resolve account name.")
        }

        setPayoutChangeForm((current) => ({
          ...current,
          accountName: String(payload?.accountName || ""),
        }))
      } catch {
        if (!controller.signal.aborted) {
          setPayoutChangeForm((current) => ({ ...current, accountName: "" }))
        }
      } finally {
        if (!controller.signal.aborted) {
          setResolvingChangeName(false)
        }
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [payoutChangeForm.accountNumber, payoutChangeForm.bankCode])

  const profileDirty = useMemo(() => {
    const nameParts = getUserNameParts(user)
    return (
      profile.firstName !== nameParts.firstName ||
      profile.middleName !== nameParts.middleName ||
      profile.lastName !== nameParts.lastName ||
      profile.email !== (user?.email || "") ||
      profile.phoneNumber !== (user?.phoneNumber || "") ||
      profile.profileImage !== (user?.profileImage || "") ||
      profile.socialPlatform !== (user?.socialProfile?.platform || "") ||
      profile.socialHandle !== (user?.socialProfile?.handle || "") ||
      profile.socialProfileUrl !== (user?.socialProfile?.profileUrl || "") ||
      profile.socialLiveUrl !== (user?.socialProfile?.liveUrl || "") ||
      Boolean(kycForm.bvn || kycForm.nin)
    )
  }, [kycForm.bvn, kycForm.nin, profile, user])

  const passwordDirty = useMemo(
    () => Boolean(passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword),
    [passwordForm],
  )

  const handleProfileChange = (field: keyof ProfileForm, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }))
    setSaveState("idle")
    setProfileMessage("")
  }

  const handleProfileImageChange = async (file: File | null) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      handleProfileChange("profileImage", typeof reader.result === "string" ? reader.result : "")
    }
    reader.readAsDataURL(file)
  }

  const handleProfileSave = async () => {
    if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.email.trim()) {
      setSaveState("error")
      setProfileMessage("First name, last name, and email are required before you can save profile changes.")
      return
    }

    if (profile.phoneNumber.trim() && !/^\+?\d{7,15}$/.test(profile.phoneNumber.trim())) {
      setSaveState("error")
      setProfileMessage("Phone number must be 7 to 15 digits and may start with +.")
      return
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth.trim())) {
      setSaveState("error")
      setProfileMessage("Date of birth is required in YYYY-MM-DD format for BVN/NIN verification.")
      return
    }

    if (kycForm.bvn && !/^\d{11}$/.test(kycForm.bvn)) {
      setSaveState("error")
      setProfileMessage("BVN must be 11 digits.")
      return
    }

    if (kycForm.nin && !/^\d{11}$/.test(kycForm.nin)) {
      setSaveState("error")
      setProfileMessage("NIN must be 11 digits.")
      return
    }

    setSaveState("saving")
    setProfileMessage("")

    try {
      const response = await authRequest("/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: profile.firstName.trim(),
          middleName: profile.middleName.trim(),
          lastName: profile.lastName.trim(),
          email: profile.email.trim(),
          phoneNumber: profile.phoneNumber.trim(),
          dateOfBirth: profile.dateOfBirth.trim(),
          profileImage: profile.profileImage,
          socialProfile: {
            platform: profile.socialPlatform.trim(),
            handle: profile.socialHandle.trim(),
            profileUrl: profile.socialProfileUrl.trim(),
            liveUrl: profile.socialLiveUrl.trim(),
          },
          ...(kycForm.bvn ? { bvn: kycForm.bvn } : {}),
          ...(kycForm.nin ? { nin: kycForm.nin } : {}),
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not save your profile.")
      }

      const nextUser = payload as AppUser
      const nextNameParts = getUserNameParts(nextUser)
      await refreshUser()
      setProfile({
        firstName: nextNameParts.firstName,
        middleName: nextNameParts.middleName,
        lastName: nextNameParts.lastName,
        email: nextUser.email,
        phoneNumber: nextUser.phoneNumber || "",
        dateOfBirth: nextUser.identity?.dateOfBirth?.slice(0, 10) || "",
        profileImage: nextUser.profileImage || "",
        socialPlatform: nextUser.socialProfile?.platform || "",
        socialHandle: nextUser.socialProfile?.handle || "",
        socialProfileUrl: nextUser.socialProfile?.profileUrl || "",
        socialLiveUrl: nextUser.socialProfile?.liveUrl || "",
      })
      setKycForm({ bvn: "", nin: "" })
      setSaveState("saved")
      setProfileMessage("Profile settings saved successfully.")
      window.setTimeout(() => setSaveState("idle"), 2500)
    } catch (error) {
      setSaveState("error")
      setProfileMessage(error instanceof Error ? error.message : "Could not save your profile.")
    }
  }

  const handlePayoutProfileSave = async () => {
    const currentNameParts = getUserNameParts(user)
    const legalNamePayload = {
      firstName: profile.firstName.trim() || currentNameParts.firstName,
      middleName: profile.middleName.trim(),
      lastName: profile.lastName.trim() || currentNameParts.lastName,
    }

    if (!payoutForm.bankCode || !payoutForm.bankName) {
      setPayoutState("error")
      setPayoutMessage("Select your payout bank.")
      return
    }

    if (payoutForm.accountNumber.length !== 10) {
      setPayoutState("error")
      setPayoutMessage("Payout account number must be 10 digits.")
      return
    }

    if (!payoutForm.accountName.trim()) {
      setPayoutState("error")
      setPayoutMessage("Wait for the bank account name to resolve.")
      return
    }

    setPayoutState("saving")
    setPayoutMessage("")

    try {
      const response = await authRequest("/payout-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: payoutForm.bankName,
          bankCode: payoutForm.bankCode,
          accountNumber: payoutForm.accountNumber,
          ...legalNamePayload,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not lock payout account.")
      }

      await refreshUser()
      setPayoutForm({ bankName: "", bankCode: "", accountNumber: "", accountName: "" })
      setPayoutState("saved")
      setPayoutMessage(payload?.warning || "Payout account verified and locked.")
      window.setTimeout(() => setPayoutState("idle"), 2500)
    } catch (error) {
      setPayoutState("error")
      setPayoutMessage(error instanceof Error ? error.message : "Could not lock payout account.")
    }
  }

  const handlePayoutChangeRequest = async () => {
    const currentNameParts = getUserNameParts(user)
    const legalNamePayload = {
      firstName: profile.firstName.trim() || currentNameParts.firstName,
      middleName: profile.middleName.trim(),
      lastName: profile.lastName.trim() || currentNameParts.lastName,
    }

    if (!payoutChangeForm.bankCode || !payoutChangeForm.bankName) {
      setPayoutState("error")
      setPayoutMessage("Select the new payout bank.")
      return
    }

    if (payoutChangeForm.accountNumber.length !== 10) {
      setPayoutState("error")
      setPayoutMessage("New payout account number must be 10 digits.")
      return
    }

    if (!payoutChangeForm.accountName.trim()) {
      setPayoutState("error")
      setPayoutMessage("Wait for the new bank account name to resolve.")
      return
    }

    if (!payoutChangeForm.supportNote.trim() || !payoutChangeForm.proofSummary.trim()) {
      setPayoutState("error")
      setPayoutMessage("Explain the change and list the ID/NIN proof support should verify.")
      return
    }

    setPayoutState("saving")
    setPayoutMessage("")

    try {
      const response = await authRequest("/payout-profile/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: payoutChangeForm.bankName,
          bankCode: payoutChangeForm.bankCode,
          accountNumber: payoutChangeForm.accountNumber,
          ...legalNamePayload,
          supportNote: payoutChangeForm.supportNote,
          proofSummary: payoutChangeForm.proofSummary,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not submit payout account change request.")
      }

      setPayoutChangeForm({
        bankName: "",
        bankCode: "",
        accountNumber: "",
        accountName: "",
        supportNote: "",
        proofSummary: "",
      })
      setPayoutState("saved")
      setPayoutMessage("Payout account change request submitted for support review.")
      window.setTimeout(() => setPayoutState("idle"), 2500)
    } catch (error) {
      setPayoutState("error")
      setPayoutMessage(
        error instanceof Error ? error.message : "Could not submit payout account change request.",
      )
    }
  }

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordState("error")
      setPasswordMessage("Current password and new password are required.")
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordState("error")
      setPasswordMessage("New password must be at least 8 characters long.")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordState("error")
      setPasswordMessage("New password confirmation does not match.")
      return
    }

    setPasswordState("saving")
    setPasswordMessage("")

    try {
      const response = await authRequest("/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: profile.firstName.trim() || getUserNameParts(user).firstName,
          middleName: profile.middleName.trim(),
          lastName: profile.lastName.trim() || getUserNameParts(user).lastName,
          email: profile.email.trim() || user?.email || "",
          profileImage: profile.profileImage,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not update password.")
      }

      await refreshUser()
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setPasswordState("saved")
      setPasswordMessage("Password updated successfully.")
      window.setTimeout(() => setPasswordState("idle"), 2500)
    } catch (error) {
      setPasswordState("error")
      setPasswordMessage(error instanceof Error ? error.message : "Could not update password.")
    }
  }

  const handleRestartGuideTour = () => {
    window.dispatchEvent(new CustomEvent(STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT))
    setProfileMessage("Creator guide tour restarted.")
    setSaveState("idle")
  }

  return (
    <div data-tour="settings-main" className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-zinc-500">
            Manage your profile, account access, live notifications, and overlay behavior from one place.
          </p>
        </div>
        <Link
          href="/dashboard/notifications"
          className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Open Notifications Page
        </Link>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Profile</h2>
            <p className="mt-1 text-sm text-zinc-500">
              This information is loaded from your backend user record and saved back there.
            </p>
          </div>

          <div className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-950/70">
                {profile.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profileImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-zinc-500" />
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900">
                  <ImagePlus className="h-4 w-4" />
                  Upload Profile Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void handleProfileImageChange(event.target.files?.[0] || null)
                    }}
                  />
                </label>
                {profile.profileImage ? (
                  <button
                    type="button"
                    onClick={() => handleProfileChange("profileImage", "")}
                    className="text-sm text-zinc-500 hover:text-white"
                  >
                    Remove current photo
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <User className="h-4 w-4 text-zinc-500" />
                  First Name
                </label>
                <Input
                  value={profile.firstName}
                  onChange={(event) => handleProfileChange("firstName", event.target.value)}
                  placeholder="First name"
                  className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Middle Name</label>
                <Input
                  value={profile.middleName}
                  onChange={(event) => handleProfileChange("middleName", event.target.value)}
                  placeholder="Optional"
                  className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Last Name</label>
                <Input
                  value={profile.lastName}
                  onChange={(event) => handleProfileChange("lastName", event.target.value)}
                  placeholder="Last name"
                  className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Mail className="h-4 w-4 text-zinc-500" />
                Email Address
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={(event) => handleProfileChange("email", event.target.value)}
                placeholder="you@example.com"
                className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Phone className="h-4 w-4 text-zinc-500" />
                Phone Number
              </label>
              <Input
                inputMode="tel"
                value={profile.phoneNumber}
                onChange={(event) =>
                  handleProfileChange("phoneNumber", event.target.value.replace(/[^\d+]/g, ""))
                }
                placeholder="+2348012345678"
                className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-fuchsia-500/20 p-2.5">
                  <RadioTower className="h-5 w-5 text-fuchsia-200" />
                </div>
                <div>
                  <p className="font-semibold text-white">Social profile and live page</p>
                  <p className="mt-1 text-sm leading-6 text-fuchsia-100/75">
                    Add the account you use for live streams so StreamTip can show it in admin and route support directly to your page.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Main platform</label>
                  <Select
                    value={profile.socialPlatform || "tiktok"}
                    onValueChange={(value) => handleProfileChange("socialPlatform", value)}
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-800 bg-zinc-900">
                      {["tiktok", "instagram", "youtube", "x", "twitch", "facebook", "other"].map((platform) => (
                        <SelectItem
                          key={platform}
                          value={platform}
                          className="text-white focus:bg-zinc-800 focus:text-white"
                        >
                          {platform === "x" ? "X / Twitter" : platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <AtSign className="h-4 w-4 text-zinc-500" />
                    Handle
                  </label>
                  <Input
                    value={profile.socialHandle}
                    onChange={(event) => handleProfileChange("socialHandle", event.target.value.replace(/^@+/, ""))}
                    placeholder="creatorhandle"
                    className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <Link2 className="h-4 w-4 text-zinc-500" />
                    Profile link
                  </label>
                  <Input
                    value={profile.socialProfileUrl}
                    onChange={(event) => handleProfileChange("socialProfileUrl", event.target.value)}
                    placeholder="https://www.tiktok.com/@creatorhandle"
                    className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <RadioTower className="h-4 w-4 text-zinc-500" />
                    Live link
                  </label>
                  <Input
                    value={profile.socialLiveUrl}
                    onChange={(event) => handleProfileChange("socialLiveUrl", event.target.value)}
                    placeholder="Optional direct live URL"
                    className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-fuchsia-100/70">
                  This saves only through your profile record, so your admin social card updates after refresh.
                </p>
                <Button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={saveState === "saving" || !user}
                  className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
                >
                  {saveState === "saving" ? "Saving..." : "Save Socials"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <CalendarDays className="h-4 w-4 text-zinc-500" />
                Date of Birth
              </label>
              <Input
                type="date"
                value={profile.dateOfBirth}
                onChange={(event) => handleProfileChange("dateOfBirth", event.target.value)}
                className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
              />
              <p className="text-xs leading-5 text-zinc-500">
                This must match the date of birth on the submitted BVN/NIN record.
              </p>
            </div>

            <div
              id="bvn-verification"
              className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4 scroll-mt-24"
            >
              <div>
                <p className="text-sm font-medium text-white">Monnify KYC</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Add or update BVN/NIN details. The backend verifies them with Monnify before saving.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    BVN
                    <HelpTip content={kycHelpText} />
                  </label>
                  <Input
                    inputMode="numeric"
                    value={kycForm.bvn}
                    onChange={(event) =>
                      setKycForm((current) => ({
                        ...current,
                        bvn: event.target.value.replace(/\D/g, "").slice(0, 11),
                      }))
                    }
                    placeholder={
                      user?.identity?.hasBvn
                        ? `Saved ending in ${user.identity.bvnLast4 || "****"}`
                        : "Enter 11-digit BVN"
                    }
                    className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                  />
                  <p className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-xs",
                    getVerificationClass(user?.identityVerification?.bvn?.status),
                  )}>
                    {getVerificationLabel(user?.identityVerification?.bvn?.status)}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    NIN
                    <HelpTip content={kycHelpText} />
                  </label>
                  <Input
                    inputMode="numeric"
                    value={kycForm.nin}
                    onChange={(event) =>
                      setKycForm((current) => ({
                        ...current,
                        nin: event.target.value.replace(/\D/g, "").slice(0, 11),
                      }))
                    }
                    placeholder={
                      user?.identity?.hasNin
                        ? `Saved ending in ${user.identity.ninLast4 || "****"}`
                        : "Enter 11-digit NIN"
                    }
                    className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                  />
                  <p className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-xs",
                    getVerificationClass(user?.identityVerification?.nin?.status),
                  )}>
                    {getVerificationLabel(user?.identityVerification?.nin?.status)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-white">Locked Payout Account</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Withdrawals can only go to this verified bank account. The account name must
                  match your first, middle, and last name.
                </p>
              </div>

              {continuePayoutSetup && !user?.payoutProfile?.locked ? (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                  Add and lock your payout bank account to finish signup.
                </div>
              ) : null}

              <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                <p>
                  Please note: Creator settlements are processed automatically through our payment provider. A payment provider processing/transfer charge may be deducted during settlement before funds reflect in your bank account.
                </p>
              </div>

              {user?.payoutProfile?.locked ? (
                <div className="space-y-4">
                  <div className="grid gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <p className="font-medium text-white">{user.payoutProfile.bankName}</p>
                    <p>{user.payoutProfile.accountName}</p>
                    <p className="font-mono">**** {String(user.payoutProfile.accountNumber || "").slice(-4)}</p>
                    <p className="text-xs text-emerald-200/80">
                      Locked account changes require support review and a 24-72 hour withdrawal cooldown.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormSelectBank
                      banks={banks}
                      value={payoutChangeForm.bankCode}
                      onChange={(value) => {
                        const selectedBank = banks.find((bank) => bank.code === value)
                        setPayoutChangeForm((current) => ({
                          ...current,
                          bankCode: value,
                          bankName: selectedBank?.name || "",
                          accountName: "",
                        }))
                      }}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300">New account number</label>
                      <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                          inputMode="numeric"
                          value={payoutChangeForm.accountNumber}
                          onChange={(event) =>
                            setPayoutChangeForm((current) => ({
                              ...current,
                              accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
                              accountName: "",
                            }))
                          }
                          className="border-zinc-700 bg-zinc-950/70 pl-11 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <ResolvedAccountInput
                    value={payoutChangeForm.accountName}
                    loading={resolvingChangeName}
                  />

                  <Textarea
                    value={payoutChangeForm.supportNote}
                    onChange={(event) =>
                      setPayoutChangeForm((current) => ({ ...current, supportNote: event.target.value }))
                    }
                    placeholder="Why do you need to change your payout account?"
                    className="min-h-24 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                  />
                  <Textarea
                    value={payoutChangeForm.proofSummary}
                    onChange={(event) =>
                      setPayoutChangeForm((current) => ({ ...current, proofSummary: event.target.value }))
                    }
                    placeholder="List the proof support should verify, e.g. government ID, NIN slip, bank document."
                    className="min-h-24 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePayoutChangeRequest}
                    disabled={payoutState === "saving"}
                    className="border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                  >
                    Request Support Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormSelectBank
                      banks={banks}
                      value={payoutForm.bankCode}
                      onChange={(value) => {
                        const selectedBank = banks.find((bank) => bank.code === value)
                        setPayoutForm((current) => ({
                          ...current,
                          bankCode: value,
                          bankName: selectedBank?.name || "",
                          accountName: "",
                        }))
                      }}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-300">Account number</label>
                      <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                          inputMode="numeric"
                          value={payoutForm.accountNumber}
                          onChange={(event) =>
                            setPayoutForm((current) => ({
                              ...current,
                              accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
                              accountName: "",
                            }))
                          }
                          className="border-zinc-700 bg-zinc-950/70 pl-11 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <ResolvedAccountInput value={payoutForm.accountName} loading={resolvingPayoutName} />

                  <Button
                    type="button"
                    onClick={handlePayoutProfileSave}
                    disabled={payoutState === "saving"}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
                  >
                    Lock Verified Payout Account
                  </Button>
                </div>
              )}

              {payoutMessage ? (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    payoutState === "error"
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
                  )}
                >
                  {payoutMessage}
                </div>
              ) : null}
            </div>

            {profileMessage ? (
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  saveState === "error"
                    ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
                )}
              >
                {profileMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-500">
                {isLoadingUser
                  ? "Loading current account details..."
                  : user
                    ? `Current creator record: ${user.name}`
                    : "No registered creator was found yet. Use the register page first."}
              </p>
              <Button
                onClick={handleProfileSave}
                disabled={saveState === "saving" || !profileDirty || !user}
                className={cn(
                  "min-w-[148px]",
                  saveState === "saved"
                    ? "bg-emerald-600 hover:bg-emerald-600"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90",
                )}
              >
                {saveState === "saving" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </span>
                ) : saveState === "saved" ? (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Profile
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
            <div className="border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Reset Password</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Change your password anytime with your current password for confirmation.
              </p>
            </div>

            <div className="space-y-4 p-6">
              <PasswordInput
                value={passwordForm.currentPassword}
                visible={showPasswords.currentPassword}
                placeholder="Current password"
                onChange={(value) =>
                  setPasswordForm((current) => ({ ...current, currentPassword: value }))
                }
                onToggleVisibility={() =>
                  setShowPasswords((current) => ({
                    ...current,
                    currentPassword: !current.currentPassword,
                  }))
                }
              />
              <PasswordInput
                value={passwordForm.newPassword}
                visible={showPasswords.newPassword}
                placeholder="New password"
                onChange={(value) =>
                  setPasswordForm((current) => ({ ...current, newPassword: value }))
                }
                onToggleVisibility={() =>
                  setShowPasswords((current) => ({
                    ...current,
                    newPassword: !current.newPassword,
                  }))
                }
              />
              <PasswordInput
                value={passwordForm.confirmPassword}
                visible={showPasswords.confirmPassword}
                placeholder="Confirm new password"
                onChange={(value) =>
                  setPasswordForm((current) => ({ ...current, confirmPassword: value }))
                }
                onToggleVisibility={() =>
                  setShowPasswords((current) => ({
                    ...current,
                    confirmPassword: !current.confirmPassword,
                  }))
                }
              />

              {passwordMessage ? (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
                    passwordState === "error"
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
                  )}
                >
                  {passwordMessage}
                </div>
              ) : null}

              <Button
                onClick={handlePasswordSave}
                disabled={passwordState === "saving" || !passwordDirty}
                className={cn(
                  "w-full",
                  passwordState === "saved"
                    ? "bg-emerald-600 hover:bg-emerald-600"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90",
                )}
              >
                {passwordState === "saving" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Updating...
                  </span>
                ) : passwordState === "saved" ? (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Updated
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Update Password
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
            <div className="border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Account Overview</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Quick reference for the creator account connected to this dashboard.
              </p>
            </div>

            <div className="space-y-4 p-6">
              <SummaryRow label="Creator name" value={user?.name || "Not registered yet"} />
              <SummaryRow label="Email" value={user?.email || "Not registered yet"} />
              <SummaryRow label="Phone" value={user?.phoneNumber || "Not saved yet"} />
              <SummaryRow
                label="KYC tier"
                value={`Tier ${user?.kyc?.tier || user?.kycTier || 1} - ${user?.kyc?.status || user?.kycStatus || "incomplete"}`}
              />
              {Number(user?.kyc?.nextTier || 0) > 0 ? (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
                  <p className="text-sm text-cyan-100">
                    Upgrade available: Tier {user?.kyc?.nextTier}
                  </p>
                  <Link href="/dashboard/kyc-upgrade" className="mt-2 inline-flex text-sm font-medium text-cyan-200 underline">
                    Start tier upgrade
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  Highest tier reached (Tier 4). No more upgrades available.
                </div>
              )}
              <SummaryRow
                label="BVN status"
                value={
                  user?.identity?.hasBvn
                    ? `Saved ending in ${user.identity.bvnLast4 || "****"}`
                    : "No BVN saved yet"
                }
              />
              <SummaryRow
                label="NIN status"
                value={
                  user?.identity?.hasNin
                    ? `Saved ending in ${user.identity.ninLast4 || "****"}`
                    : "No NIN saved yet"
                }
              />
              <SummaryRow
                label="Virtual account"
                value={user?.virtualAccount?.accountNumber || "No virtual account yet"}
              />
              <SummaryRow
                label="Bank"
                value={user?.virtualAccount?.bankName || "Paystack account not created yet"}
              />
              <SummaryRow
                label="Provider"
                value={user?.virtualAccount?.provider || "Paystack"}
                icon={CreditCard}
              />
              <SummaryRow label="Member since" value={formatMemberDate(user?.createdAt)} />
              <Button
                type="button"
                variant="outline"
                onClick={handleRestartGuideTour}
                className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
              >
                Restart Guide Tour
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Notification Settings</h2>
            <p className="mt-1 text-sm text-zinc-500">
              These update instantly and are shared with the dedicated notifications page.
            </p>
          </div>

          <div className="space-y-3 p-6">
            {NOTIFICATION_SETTINGS.map(({ id, label, description, icon: Icon }) => (
              <SettingToggle
                key={id}
                icon={Icon}
                label={label}
                description={description}
                enabled={preferences[id]}
                onToggle={(checked) => {
                  void updatePreference(id, checked)
                }}
              />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80">
          <div className="border-b border-zinc-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Overlay Settings</h2>
            <p className="mt-1 text-sm text-zinc-500">
              These are the live overlay controls used by the overlay page.
            </p>
          </div>

          <div className="space-y-3 p-6">
            {OVERLAY_SETTINGS.map(({ id, label, description, icon: Icon }) => (
              <SettingToggle
                key={id}
                icon={Icon}
                label={label}
                description={description}
                enabled={overlaySettings[id]}
                onToggle={(checked) => {
                  void updateSetting(id, checked)
                }}
              />
            ))}

            <Link
              href="/dashboard/overlay"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-900"
            >
              Open Overlay Controls
            </Link>
          </div>
        </div>
      </section>

      <OverlayShowcaseSettings
        customization={customization}
        giftPacks={giftPackThemes}
        onGiftPackChange={(giftPack) => updateCustomization("giftPack", giftPack)}
        onGoalTitleChange={(title) => updateCustomization("goalTitle", title)}
        onGoalAmountChange={(amount) =>
          updateCustomization("goalAmount", Number.isFinite(amount) ? Math.max(1000, amount) : 1000)
        }
      />
    </div>
  )
}

function SummaryRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: ElementType
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="rounded-lg bg-zinc-800 p-2">
            <Icon className="h-4 w-4 text-zinc-300" />
          </div>
        ) : null}
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SettingToggle({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
}: {
  icon: ElementType
  label: string
  description: string
  enabled: boolean
  onToggle: (checked: boolean) => void
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-2xl p-4 transition-all",
        enabled
          ? "border border-purple-500/30 bg-purple-500/10"
          : "border border-zinc-800 bg-zinc-950/60",
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn("rounded-xl p-2.5", enabled ? "bg-purple-500/20" : "bg-zinc-800")}>
          <Icon className={cn("h-5 w-5", enabled ? "text-purple-300" : "text-zinc-500")} />
        </div>
        <div>
          <p className={cn("font-medium", enabled ? "text-white" : "text-zinc-300")}>
            {label}
          </p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-purple-500"
      />
    </div>
  )
}

function FormSelectBank({
  banks,
  value,
  onChange,
}: {
  banks: BankOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">Bank</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
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
    </div>
  )
}

function ResolvedAccountInput({ value, loading }: { value: string; loading: boolean }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">Resolved account name</label>
      <div className="relative">
        <Input
          readOnly
          value={value}
          placeholder={loading ? "Resolving account name..." : "Account name appears automatically"}
          className="border-zinc-700 bg-zinc-950/70 pr-11 text-white placeholder:text-zinc-500"
        />
        {loading ? (
          <LoaderCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
        ) : null}
      </div>
    </div>
  )
}

function PasswordInput({
  value,
  visible,
  placeholder,
  onChange,
  onToggleVisibility,
}: {
  value: string
  visible: boolean
  placeholder: string
  onChange: (value: string) => void
  onToggleVisibility: () => void
}) {
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-zinc-700 bg-zinc-950/70 pr-12 text-white placeholder:text-zinc-500"
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-white"
        aria-label={visible ? `Hide ${placeholder.toLowerCase()}` : `Show ${placeholder.toLowerCase()}`}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

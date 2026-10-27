"use client"

import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  Copy,
  Eye,
  EyeOff,
  Gift,
  ImagePlus,
  KeyRound,
  Landmark,
  LoaderCircle,
  Mail,
  MonitorPlay,
  Phone,
  RadioTower,
  Save,
  Sigma,
  ShieldCheck,
  Sparkles,
  Target,
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
import { HelpTip } from "@/components/help-tip"
import { giftPackThemes } from "@/lib/gifts"
import type { GiftPackId } from "@/lib/overlay-customization"
import Link from "next/link"
import { authRequest } from "@/lib/auth-client"
import { STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT } from "@/hooks/use-onboarding-tour"
import { toast } from "@/hooks/use-toast"
import { notificationSoundOptions, type NotificationSoundId } from "@/lib/app-preferences"
import { emitNotificationFeedback } from "@/lib/notification-runtime"
import { getOverlayUrl, type OverlayUrlMode } from "@/lib/runtime-config"
import { cn } from "@/lib/utils"
import {
  CREATOR_NICKNAME_MAX_LENGTH,
  getCreatorNickname,
  normalizeCreatorNickname,
  validateCreatorNickname,
} from "@/lib/nickname"
import type { AppPreferences } from "@/lib/app-preferences"
import type { OverlaySettingId } from "@/lib/overlay-settings"
import type { AppUser } from "@/lib/user"
import {
  SocialProfileFields,
  formatSocialPlatform,
  getSocialProfileDraft,
  hasSocialProfile,
  type SocialProfileDraft,
} from "@/components/dashboard/social-profile-fields"

type ProfileForm = {
  firstName: string
  middleName: string
  lastName: string
  email: string
  phoneNumber: string
  dateOfBirth: string
  profileImage: string
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
type SettingsTab = "profile" | "payments" | "stream" | "notifications" | "security"

const SETTINGS_TABS: Array<{
  id: SettingsTab
  label: string
  description: string
  icon: ElementType
}> = [
  {
    id: "profile",
    label: "Profile",
    description: "Creator identity and socials.",
    icon: User,
  },
  {
    id: "payments",
    label: "Payments",
    description: "KYC, payout and settlement details.",
    icon: Wallet,
  },
  {
    id: "stream",
    label: "Stream",
    description: "Overlays, alerts and live setup.",
    icon: MonitorPlay,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Browser alerts and sounds.",
    icon: Bell,
  },
  {
    id: "security",
    label: "Security",
    description: "Password and account protection.",
    icon: KeyRound,
  },
]

const OVERLAY_URL_CARDS: Array<{
  mode: OverlayUrlMode
  title: string
  description: string
  settingId?: OverlaySettingId
  icon: ElementType
}> = [
  {
    mode: "gifts",
    title: "Donation Animation",
    description: "Transparent alert overlay for real-time donation effects.",
    settingId: "animations",
    icon: Gift,
  },
  {
    mode: "leaderboard",
    title: "Leaderboard",
    description: "Top supporter overlay for OBS and TikTok Studio.",
    icon: RadioTower,
  },
  {
    mode: "goal",
    title: "Donation Goal",
    description: "Compact progress bar overlay for creator goals.",
    icon: Target,
  },
  {
    mode: "account",
    title: "Account Widget",
    description: "Virtual account widget viewers can copy during streams.",
    icon: Wallet,
  },
  {
    mode: "total",
    title: "Donation Total",
    description: "Running total of donations since your last reset.",
    icon: Sigma,
  },
]

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
  const { user, refreshUser, logout } = useAuth()
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
  const savedNickname = getCreatorNickname(user)
  const [nicknameInput, setNicknameInput] = useState(savedNickname)
  const [nicknameState, setNicknameState] = useState<SaveState>("idle")
  const [nicknameMessage, setNicknameMessage] = useState("")
  const nicknameSavingRef = useRef(false)
  const [socialDraft, setSocialDraft] = useState<SocialProfileDraft>(() => getSocialProfileDraft(user))
  const [socialState, setSocialState] = useState<SaveState>("idle")
  const [socialMessage, setSocialMessage] = useState("")
  const socialSavingRef = useRef(false)
  const syncedProfileRef = useRef<ProfileForm | null>(null)
  const syncedSocialRef = useRef<SocialProfileDraft | null>(null)
  const [passwordState, setPasswordState] = useState<SaveState>("idle")
  const [profileMessage, setProfileMessage] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteState, setDeleteState] = useState<SaveState>("idle")
  const [deleteMessage, setDeleteMessage] = useState("")
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [continuePayoutSetup, setContinuePayoutSetup] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
  const [tabScrollPositions, setTabScrollPositions] = useState<Record<SettingsTab, number>>({
    profile: 0,
    payments: 0,
    stream: 0,
    notifications: 0,
    security: 0,
  })
  const kycHelpText =
    "BVN and NIN are verified by Monnify on the backend. We only send them to the backend for account and KYC checks."

  useEffect(() => {
    setContinuePayoutSetup(new URLSearchParams(window.location.search).get("complete") === "payout")
  }, [])

  useEffect(() => {
    const nameParts = getUserNameParts(user)
    const nextProfile: ProfileForm = {
      firstName: nameParts.firstName,
      middleName: nameParts.middleName,
      lastName: nameParts.lastName,
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      dateOfBirth: user?.identity?.dateOfBirth?.slice(0, 10) || "",
      profileImage: user?.profileImage || "",
    }
    const nextSocial = getSocialProfileDraft(user)
    const previousProfile = syncedProfileRef.current
    const previousSocial = syncedSocialRef.current
    syncedProfileRef.current = nextProfile
    syncedSocialRef.current = nextSocial

    // Settings now has several independent save buttons that refresh the user. Keep any field the creator
    // has edited but not saved yet; refresh everything else from the latest saved profile.
    setProfile((current) => {
      if (!previousProfile) return nextProfile
      const merged = { ...nextProfile }
      for (const key of Object.keys(nextProfile) as Array<keyof ProfileForm>) {
        if (current[key] !== previousProfile[key]) merged[key] = current[key]
      }
      return merged
    })
    setSocialDraft((current) => {
      if (!previousSocial) return nextSocial
      const merged = { ...nextSocial }
      for (const key of Object.keys(nextSocial) as Array<keyof SocialProfileDraft>) {
        if (current[key] !== previousSocial[key]) merged[key] = current[key]
      }
      return merged
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
      Boolean(kycForm.bvn || kycForm.nin)
    )
  }, [kycForm.bvn, kycForm.nin, profile, user])

  const passwordDirty = useMemo(
    () => Boolean(passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword),
    [passwordForm],
  )

  const activeTabMeta = SETTINGS_TABS.find((tab) => tab.id === activeTab) || SETTINGS_TABS[0]
  const kycStatus = user?.kyc?.status || user?.kycStatus || "incomplete"
  const creatorTier = user?.kyc?.tier || user?.kycTier || 1
  const verificationComplete = Boolean(
    user?.identity?.hasBvn &&
      user?.identity?.hasNin &&
      user?.payoutProfile?.locked &&
      (kycStatus === "verified" || kycStatus === "complete" || user?.identityVerification?.bvn?.status === "verified"),
  )

  const switchTab = (tab: SettingsTab) => {
    if (tab === activeTab) return

    setTabScrollPositions((current) => ({
      ...current,
      [activeTab]: typeof window === "undefined" ? current[activeTab] : window.scrollY,
    }))
    setActiveTab(tab)

    window.setTimeout(() => {
      window.scrollTo({
        top: tabScrollPositions[tab] || 0,
        behavior: "smooth",
      })
    }, 20)
  }

  const copyOverlayUrl = async (mode: OverlayUrlMode, label: string) => {
    const url = getOverlayUrl(user, mode)
    await navigator.clipboard.writeText(url)
    toast({
      title: "Overlay URL copied",
      description: `${label} link is ready for OBS or TikTok Studio.`,
    })
  }

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

  useEffect(() => {
    setNicknameInput(savedNickname)
  }, [savedNickname])

  const nicknameDirty = normalizeCreatorNickname(nicknameInput) !== savedNickname

  const handleNicknameSave = async () => {
    if (nicknameSavingRef.current || !user) return

    const validationError = validateCreatorNickname(nicknameInput)
    if (validationError) {
      setNicknameState("error")
      setNicknameMessage(validationError)
      return
    }

    nicknameSavingRef.current = true
    setNicknameState("saving")
    setNicknameMessage("")

    try {
      const response = await authRequest("/user/nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: normalizeCreatorNickname(nicknameInput) }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not save your creator nickname.")
      }

      const previousReferralCode = String((user as { referralCode?: string } | null)?.referralCode || "")
      const nextReferralCode = String((payload as { referralCode?: string } | null)?.referralCode || "")
      setNicknameInput(getCreatorNickname(payload as AppUser))
      await refreshUser()
      setNicknameState("saved")
      setNicknameMessage(
        nextReferralCode && nextReferralCode !== previousReferralCode
          ? `Creator nickname saved. Your referral code is now ${nextReferralCode}; links with your old code still work.`
          : "Creator nickname saved. Your overlay will show it on its next refresh.",
      )
    } catch (error) {
      setNicknameState("error")
      setNicknameMessage(
        error instanceof TypeError
          ? "Couldn't reach the server. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not save your creator nickname.",
      )
    } finally {
      nicknameSavingRef.current = false
    }
  }

  const savedSocialDraft = getSocialProfileDraft(user)
  const socialDirty =
    (socialDraft.platform || "tiktok") !== (savedSocialDraft.platform || "tiktok") ||
    socialDraft.handle.trim() !== savedSocialDraft.handle ||
    socialDraft.profileUrl.trim() !== savedSocialDraft.profileUrl ||
    socialDraft.liveUrl.trim() !== savedSocialDraft.liveUrl

  // Same request the former "Add your social page" dashboard popup sent: the creator's saved profile
  // details plus the updated socialProfile, so unsaved edits elsewhere on this page are never submitted.
  const handleSocialSave = async () => {
    if (socialSavingRef.current || !user) return

    socialSavingRef.current = true
    setSocialState("saving")
    setSocialMessage("")

    try {
      const response = await authRequest("/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: user.firstName || user.identity?.firstName || "",
          middleName: user.middleName || user.identity?.middleName || "",
          lastName: user.lastName || user.identity?.lastName || "",
          email: user.email,
          phoneNumber: user.phoneNumber || "",
          dateOfBirth: user.identity?.dateOfBirth?.slice(0, 10) || "",
          profileImage: user.profileImage || "",
          socialProfile: {
            platform: socialDraft.platform || "tiktok",
            handle: socialDraft.handle.trim(),
            profileUrl: socialDraft.profileUrl.trim(),
            liveUrl: socialDraft.liveUrl.trim(),
          },
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || "Could not save social profile.")
      }

      setSocialDraft(getSocialProfileDraft(payload as AppUser))
      await refreshUser()
      setSocialState("saved")
      setSocialMessage("Social profile saved.")
    } catch (error) {
      setSocialState("error")
      setSocialMessage(
        error instanceof TypeError
          ? "Couldn't reach the server. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "Could not save social profile.",
      )
    } finally {
      socialSavingRef.current = false
    }
  }

  // Deep links from the dashboard (#social-profiles) and the virtual-account BVN prompt (#bvn-verification).
  useEffect(() => {
    if (isLoadingUser || typeof window === "undefined") return
    const hash = window.location.hash
    const target = hash === "#social-profiles" ? "social-profiles" : hash === "#bvn-verification" ? "bvn-verification" : ""
    if (!target) return
    if (target === "bvn-verification") setActiveTab("payments")
    let inner = 0
    const frame = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    })
    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(inner)
    }
  }, [isLoadingUser])

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

    if ((kycForm.bvn || kycForm.nin) && !/^\d{4}-\d{2}-\d{2}$/.test(profile.dateOfBirth.trim())) {
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
      })
      setKycForm({ bvn: "", nin: "" })
      setSaveState("saved")
      setProfileMessage("Profile settings saved successfully.")
      toast({
        title: "Settings saved",
        description: "Your creator profile has been updated.",
      })
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
      toast({
        title: "Payment settings saved",
        description: "Your payout account is verified and locked.",
      })
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
      toast({
        title: "Request submitted",
        description: "Support will review your payout account change request.",
      })
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
      toast({
        title: "Password updated",
        description: "Your security settings have been saved.",
      })
      window.setTimeout(() => setPasswordState("idle"), 2500)
    } catch (error) {
      setPasswordState("error")
      setPasswordMessage(error instanceof Error ? error.message : "Could not update password.")
    }
  }

  const handleAccountDeletion = async () => {
    if (!deletePassword) {
      setDeleteState("error")
      setDeleteMessage("Enter your current password to archive your account.")
      return
    }

    if (!window.confirm("Archive your StreamTip account? You will be signed out immediately. Financial and compliance records will be retained.")) {
      return
    }

    setDeleteState("saving")
    setDeleteMessage("")
    try {
      const response = await authRequest("/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: deletePassword, reason: deleteReason.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Could not archive your account.")
      }

      await logout()
      window.location.assign("/")
    } catch (error) {
      setDeleteState("error")
      setDeleteMessage(error instanceof Error ? error.message : "Could not archive your account.")
    }
  }

  const handleRestartGuideTour = () => {
    window.dispatchEvent(new CustomEvent(STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT))
    setProfileMessage("Creator guide tour restarted.")
    setSaveState("idle")
  }

  const handlePaymentsSave = async () => {
    const hasKycUpdate = Boolean(kycForm.bvn || kycForm.nin)
    const hasNewPayout = Boolean(!user?.payoutProfile?.locked && (payoutForm.bankCode || payoutForm.accountNumber))
    const hasPayoutChange = Boolean(
      user?.payoutProfile?.locked &&
        (payoutChangeForm.bankCode ||
          payoutChangeForm.accountNumber ||
          payoutChangeForm.supportNote ||
          payoutChangeForm.proofSummary),
    )

    if (hasKycUpdate) {
      await handleProfileSave()
      return
    }

    if (hasNewPayout) {
      await handlePayoutProfileSave()
      return
    }

    if (hasPayoutChange) {
      await handlePayoutChangeRequest()
      return
    }

    toast({
      title: "Payment settings saved",
      description: "There are no pending payment changes.",
    })
  }

  const handleStreamSave = () => {
    toast({
      title: "Stream settings saved",
      description: "Overlay and stream preferences are up to date.",
    })
  }

  const handleNotificationSave = () => {
    toast({
      title: "Notification settings saved",
      description: "Your alert preferences are ready.",
    })
  }

  const handleTestNotification = async () => {
    await emitNotificationFeedback("donation", preferences, {
      title: "StreamTips test notification",
      body: "Donation alerts are working.",
      tag: "streamtips-settings-test",
    })
    toast({
      title: "Test notification sent",
      description: "If browser notifications are allowed, you should see it now.",
    })
  }

  return (
    <div data-tour="settings-main" className="mx-auto w-full max-w-6xl space-y-5 p-4 pb-12 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Your profile, payments and verification, stream setup, notifications and security.
        </p>
      </header>

      <div className="sticky top-0 z-30 -mx-5 border-y border-white/10 bg-black/80 px-5 py-3 backdrop-blur-xl lg:static lg:mx-0 lg:rounded-2xl lg:border lg:bg-zinc-950/60 lg:p-2">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {SETTINGS_TABS.map(({ id, label, description, icon: Icon }) => {
            const selected = activeTab === id

            return (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={cn(
                  "group flex min-w-[164px] items-center gap-3 rounded-xl px-4 py-3 text-left transition-all lg:min-w-0",
                  selected
                    ? "bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white shadow-lg shadow-fuchsia-950/30"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-white/15" : "bg-zinc-900 group-hover:bg-zinc-800",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className={cn("hidden text-xs lg:block", selected ? "text-white/70" : "text-zinc-500")}>
                    {description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-2 border-b border-white/10 pb-5">
            <h2 className="text-2xl font-semibold text-white">{activeTabMeta.label}</h2>
            <p className="text-sm leading-6 text-zinc-500">{activeTabMeta.description}</p>
          </div>

          {activeTab === "profile" ? (
            <div className="space-y-6">
              <SettingsPanel
                title="Creator Nickname"
                description="Your public name. Supporters see it on your overlay, in battles, and on referral pages, and it sets your referral code (older codes keep working). It never changes your legal name or payout details."
              >
                <form
                  className="flex flex-col gap-3 sm:flex-row sm:items-start"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleNicknameSave()
                  }}
                >
                  <div className="flex-1 space-y-2">
                    <label htmlFor="settings-nickname" className="sr-only">
                      Creator nickname
                    </label>
                    <Input
                      id="settings-nickname"
                      value={nicknameInput}
                      onChange={(event) => {
                        setNicknameInput(event.target.value)
                        if (nicknameState !== "saving") {
                          setNicknameState("idle")
                          setNicknameMessage("")
                        }
                      }}
                      maxLength={CREATOR_NICKNAME_MAX_LENGTH * 2}
                      placeholder={isLoadingUser ? "Loading..." : "e.g. AdaPlays"}
                      disabled={!user || nicknameState === "saving"}
                      aria-invalid={nicknameState === "error" || undefined}
                      aria-describedby="settings-nickname-hint"
                      className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500"
                    />
                    <p id="settings-nickname-hint" className="flex justify-between gap-3 text-xs text-zinc-500">
                      <span>
                        {savedNickname
                          ? `Currently shown as “${savedNickname}”.`
                          : user
                            ? "You haven't set a nickname yet. Your overlay shows your account name until you do."
                            : ""}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {Array.from(nicknameInput).length}/{CREATOR_NICKNAME_MAX_LENGTH}
                      </span>
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={!user || !nicknameDirty || nicknameState === "saving"}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white sm:min-w-32"
                  >
                    {nicknameState === "saving" ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {nicknameState === "saving" ? "Saving..." : savedNickname ? "Update nickname" : "Save nickname"}
                  </Button>
                </form>
                {nicknameMessage ? <FeedbackMessage state={nicknameState} message={nicknameMessage} /> : null}
              </SettingsPanel>

              <SettingsPanel
                title="Creator Profile"
                description="Only the identity and contact details creators need to update frequently."
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-fuchsia-500/30 bg-zinc-950/80 shadow-lg shadow-fuchsia-950/20">
                    {profile.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.profileImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-9 w-9 text-zinc-500" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10">
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
                        className="block text-sm text-zinc-500 transition-colors hover:text-white"
                      >
                        Remove current photo
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="First Name" icon={User}>
                    <Input value={profile.firstName} onChange={(event) => handleProfileChange("firstName", event.target.value)} placeholder="First name" className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                  </Field>
                  <Field label="Middle Name">
                    <Input value={profile.middleName} onChange={(event) => handleProfileChange("middleName", event.target.value)} placeholder="Optional" className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                  </Field>
                  <Field label="Last Name">
                    <Input value={profile.lastName} onChange={(event) => handleProfileChange("lastName", event.target.value)} placeholder="Last name" className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Email Address" icon={Mail}>
                    <Input type="email" value={profile.email} onChange={(event) => handleProfileChange("email", event.target.value)} placeholder="you@example.com" className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                  </Field>
                  <Field label="Phone Number" icon={Phone}>
                    <Input inputMode="tel" value={profile.phoneNumber} onChange={(event) => handleProfileChange("phoneNumber", event.target.value.replace(/[^\d+]/g, ""))} placeholder="+2348012345678" className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                  </Field>
                </div>

                {profileMessage ? <FeedbackMessage state={saveState} message={profileMessage} /> : null}
              </SettingsPanel>

              <TabSaveBar
                note={isLoadingUser ? "Loading current creator details..." : user ? `Saving as ${user.name}` : "No registered creator was found yet."}
                disabled={saveState === "saving" || !profileDirty || !user}
                state={saveState}
                idleLabel="Save Changes"
                savingLabel="Saving..."
                savedLabel="Saved"
                onSave={handleProfileSave}
              />

              <div id="social-profiles" className="scroll-mt-6">
                <SettingsPanel
                  title="Social Profiles"
                  description="Add the account you use for live streams so StreamTip can identify your page and help with your live setup."
                >
                  {hasSocialProfile(user) ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/60 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Saved page</p>
                        <p className="mt-1 truncate font-semibold text-white">
                          {formatSocialPlatform(user?.socialProfile?.platform || "tiktok")}
                          {user?.socialProfile?.handle ? ` \u00b7 @${user.socialProfile.handle}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {user?.socialProfile?.profileUrl ? (
                          <a href={user.socialProfile.profileUrl} target="_blank" rel="noopener noreferrer" className="text-purple-200 underline-offset-4 hover:underline">
                            Profile link
                          </a>
                        ) : null}
                        {user?.socialProfile?.liveUrl ? (
                          <a href={user.socialProfile.liveUrl} target="_blank" rel="noopener noreferrer" className="text-purple-200 underline-offset-4 hover:underline">
                            Live link
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : user ? (
                    <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-zinc-400">
                      No social page added yet. Add your handle, profile link, or live link below.
                    </div>
                  ) : null}

                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void handleSocialSave()
                    }}
                  >
                    <SocialProfileFields
                      idPrefix="settings-social"
                      value={socialDraft}
                      disabled={!user || socialState === "saving"}
                      onChange={(next) => {
                        setSocialDraft(next)
                        if (socialState !== "saving") {
                          setSocialState("idle")
                          setSocialMessage("")
                        }
                      }}
                    />
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                      {socialDirty && socialState !== "saving" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSocialDraft(getSocialProfileDraft(user))
                            setSocialState("idle")
                            setSocialMessage("")
                          }}
                          className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
                        >
                          Discard changes
                        </Button>
                      ) : null}
                      <Button
                        type="submit"
                        disabled={!user || !socialDirty || socialState === "saving"}
                        className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white hover:opacity-90"
                      >
                        {socialState === "saving" ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {socialState === "saving" ? "Saving..." : "Save Social Profile"}
                      </Button>
                    </div>
                  </form>
                  {socialMessage ? <FeedbackMessage state={socialState} message={socialMessage} /> : null}
                </SettingsPanel>
              </div>
            </div>
          ) : null}

          {activeTab === "payments" ? (
            <div className="space-y-6">
              <div
                className={cn(
                  "rounded-2xl p-5",
                  verificationComplete
                    ? "border border-emerald-500/20 bg-emerald-500/10"
                    : "border border-amber-500/20 bg-amber-500/10",
                )}
              >
                <div className="flex gap-4">
                  <div className={cn("rounded-xl p-3", verificationComplete ? "bg-emerald-500/20" : "bg-amber-500/20")}>
                    {verificationComplete ? <ShieldCheck className="h-6 w-6 text-emerald-200" /> : <AlertTriangle className="h-6 w-6 text-amber-200" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {verificationComplete ? "Payments are verified" : "Payment verification needs attention"}
                    </h3>
                    <p className={cn("mt-1 text-sm leading-6", verificationComplete ? "text-emerald-100/75" : "text-amber-100/75")}>
                      {verificationComplete
                        ? "Your KYC and payout account are ready for creator settlements."
                        : "Complete KYC and lock a payout account so settlements can move smoothly."}
                    </p>
                  </div>
                </div>
              </div>

              <div id="bvn-verification" className="scroll-mt-6">
              <SettingsPanel title="Verification Status" description="BVN, NIN, tier, reserved account, and KYC status.">
                <div className="grid gap-4 md:grid-cols-3">
                  <StatusPill label="Creator Tier" value={`Tier ${creatorTier}`} />
                  <StatusPill label="KYC Status" value={String(kycStatus)} />
                  <StatusPill label="Reserved Account" value={user?.virtualAccount?.accountNumber || "Not generated"} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Date of Birth for Verification">
                    <Input type="date" value={profile.dateOfBirth} onChange={(event) => handleProfileChange("dateOfBirth", event.target.value)} className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                  </Field>
                  <Field label="BVN" help={kycHelpText}>
                    <Input inputMode="numeric" value={kycForm.bvn} onChange={(event) => setKycForm((current) => ({ ...current, bvn: event.target.value.replace(/\D/g, "").slice(0, 11) }))} placeholder={user?.identity?.hasBvn ? `Saved ending in ${user.identity.bvnLast4 || "****"}` : "Enter 11-digit BVN"} className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                    <VerificationBadge status={user?.identityVerification?.bvn?.status} />
                  </Field>
                  <Field label="NIN" help={kycHelpText}>
                    <Input inputMode="numeric" value={kycForm.nin} onChange={(event) => setKycForm((current) => ({ ...current, nin: event.target.value.replace(/\D/g, "").slice(0, 11) }))} placeholder={user?.identity?.hasNin ? `Saved ending in ${user.identity.ninLast4 || "****"}` : "Enter 11-digit NIN"} className="border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                    <VerificationBadge status={user?.identityVerification?.nin?.status} />
                  </Field>
                  <StatusPill label="Reserved Bank" value={user?.virtualAccount?.bankName || "Not available"} />
                </div>
              </SettingsPanel>
              </div>

              <SettingsPanel title="Settlement Information" description="Withdrawal account and account change requests.">
                {continuePayoutSetup && !user?.payoutProfile?.locked ? (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                    Add and lock your payout bank account to finish signup.
                  </div>
                ) : null}

                <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" />
                  <p>Creator settlements are processed automatically through the payment provider. Provider transfer charges may be deducted before funds reflect in your bank account.</p>
                </div>

                {user?.payoutProfile?.locked ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                      <p className="font-medium text-white">{user.payoutProfile.bankName}</p>
                      <p>{user.payoutProfile.accountName}</p>
                      <p className="font-mono">**** {String(user.payoutProfile.accountNumber || "").slice(-4)}</p>
                      <p className="mt-2 text-xs text-emerald-200/80">Locked account changes require support review and a 24-72 hour withdrawal cooldown.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormSelectBank banks={banks} value={payoutChangeForm.bankCode} onChange={(value) => {
                        const selectedBank = banks.find((bank) => bank.code === value)
                        setPayoutChangeForm((current) => ({ ...current, bankCode: value, bankName: selectedBank?.name || "", accountName: "" }))
                      }} />
                      <Field label="New Account Number">
                        <div className="relative">
                          <Landmark className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <Input inputMode="numeric" value={payoutChangeForm.accountNumber} onChange={(event) => setPayoutChangeForm((current) => ({ ...current, accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10), accountName: "" }))} className="border-zinc-700 bg-zinc-950/70 pl-11 text-white" />
                        </div>
                      </Field>
                    </div>
                    <ResolvedAccountInput value={payoutChangeForm.accountName} loading={resolvingChangeName} />
                    <Textarea value={payoutChangeForm.supportNote} onChange={(event) => setPayoutChangeForm((current) => ({ ...current, supportNote: event.target.value }))} placeholder="Why do you need to change your payout account?" className="min-h-24 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                    <Textarea value={payoutChangeForm.proofSummary} onChange={(event) => setPayoutChangeForm((current) => ({ ...current, proofSummary: event.target.value }))} placeholder="List the proof support should verify, e.g. government ID, NIN slip, bank document." className="min-h-24 border-zinc-700 bg-zinc-950/70 text-white placeholder:text-zinc-500" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormSelectBank banks={banks} value={payoutForm.bankCode} onChange={(value) => {
                        const selectedBank = banks.find((bank) => bank.code === value)
                        setPayoutForm((current) => ({ ...current, bankCode: value, bankName: selectedBank?.name || "", accountName: "" }))
                      }} />
                      <Field label="Withdrawal Account Number">
                        <div className="relative">
                          <Landmark className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          <Input inputMode="numeric" value={payoutForm.accountNumber} onChange={(event) => setPayoutForm((current) => ({ ...current, accountNumber: event.target.value.replace(/\D/g, "").slice(0, 10), accountName: "" }))} className="border-zinc-700 bg-zinc-950/70 pl-11 text-white" />
                        </div>
                      </Field>
                    </div>
                    <ResolvedAccountInput value={payoutForm.accountName} loading={resolvingPayoutName} />
                  </div>
                )}

                {payoutMessage ? <FeedbackMessage state={payoutState} message={payoutMessage} /> : null}
                {profileMessage && saveState === "error" ? <FeedbackMessage state={saveState} message={profileMessage} /> : null}
              </SettingsPanel>

              <TabSaveBar note="Save KYC updates, payout account setup, or account change requests from here." disabled={payoutState === "saving" || saveState === "saving"} state={payoutState === "saving" ? payoutState : saveState} idleLabel="Save Changes" savingLabel="Saving..." savedLabel="Saved" onSave={handlePaymentsSave} />
            </div>
          ) : null}

          {activeTab === "stream" ? (
            <div className="space-y-6">
              <SettingsPanel title="Livestream Setup" description="Everything that appears in OBS, TikTok Studio, or the live overlay.">
                <div className="grid gap-3 md:grid-cols-2">
                  {OVERLAY_SETTINGS.map(({ id, label, description, icon: Icon }) => (
                    <SettingToggle key={id} icon={Icon} label={label} description={description} enabled={overlaySettings[id]} onToggle={(checked) => void updateSetting(id, checked)} />
                  ))}
                </div>
              </SettingsPanel>

              <SettingsPanel title="Overlay URLs" description="Copy each lightweight overlay into your streaming software.">
                {user && !savedNickname ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                    Your account-number overlay shows your account name because you haven&apos;t set a creator nickname.{" "}
                    <button
                      type="button"
                      onClick={() => switchTab("profile")}
                      className="font-semibold text-white underline underline-offset-4"
                    >
                      Set a nickname
                    </button>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  {OVERLAY_URL_CARDS.map(({ mode, title, description, settingId, icon: Icon }) => {
                    const enabled = settingId ? overlaySettings[settingId] : true

                    return (
                      <div key={mode} className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="rounded-xl bg-purple-500/15 p-2.5">
                              <Icon className="h-5 w-5 text-purple-200" />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{title}</p>
                              <p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p>
                            </div>
                          </div>
                          <span className={cn("rounded-full px-2.5 py-1 text-xs", enabled ? "bg-emerald-500/10 text-emerald-200" : "bg-zinc-800 text-zinc-400")}>
                            {enabled ? "Active" : "Off"}
                          </span>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button type="button" onClick={() => void copyOverlayUrl(mode, title)} className="flex-1 bg-white text-zinc-950 hover:bg-zinc-200">
                            <Copy className="mr-2 h-4 w-4" />
                            Copy URL
                          </Button>
                          <Button type="button" variant="outline" disabled className="border-zinc-700 bg-zinc-900 text-zinc-400">
                            Preview
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SettingsPanel>

              <SettingsPanel title="Goal and gift style" description="Goal title and amount live in Overlay Settings. Overlay colours are fixed so every stream stays readable.">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{customization.goalTitle || "Donation goal"}</p>
                      <p className="text-xs text-zinc-500 tabular-nums">Goal NGN {Number(customization.goalAmount || 0).toLocaleString()}</p>
                    </div>
                    <Link href="/dashboard/overlay?tab=goal" className="shrink-0 text-sm font-medium text-white underline underline-offset-4">
                      Edit goal
                    </Link>
                  </div>
                  <Field label="Gift Animation Style">
                    <Select value={customization.giftPack} onValueChange={(value) => updateCustomization("giftPack", value as GiftPackId)}>
                      <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-800 bg-zinc-900">
                        {giftPackThemes.map((theme) => (
                          <SelectItem key={theme.id} value={theme.id} className="text-white focus:bg-zinc-800 focus:text-white">
                            {theme.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </SettingsPanel>

              <TabSaveBar note="Most stream settings save instantly; this confirms your current setup." disabled={false} state="idle" idleLabel="Save Changes" onSave={handleStreamSave} />
            </div>
          ) : null}

          {activeTab === "notifications" ? (
            <div className="space-y-6">
              <SettingsPanel title="Notification Preferences" description="Browser notifications, donation alerts, payout alerts, and sounds.">
                <div className="grid gap-3 md:grid-cols-2">
                  {NOTIFICATION_SETTINGS.map(({ id, label, description, icon: Icon }) => (
                    <SettingToggle key={id} icon={Icon} label={label} description={description} enabled={preferences[id]} onToggle={(checked) => void updatePreference(id, checked)} />
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <SoundSelect label="Browser Sound" value={preferences.desktopSound} onChange={(value) => void updatePreference("desktopSound", value)} />
                  <SoundSelect label="Donation Sound" value={preferences.donationSound} onChange={(value) => void updatePreference("donationSound", value)} />
                  <SoundSelect label="Payout Sound" value={preferences.payoutSound} onChange={(value) => void updatePreference("payoutSound", value)} />
                </div>

                <Button type="button" variant="outline" onClick={() => void handleTestNotification()} className="border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20">
                  <Bell className="mr-2 h-4 w-4" />
                  Test Notification
                </Button>
              </SettingsPanel>

              <TabSaveBar note="Notification toggles save instantly to this browser." disabled={false} state="idle" idleLabel="Save Changes" onSave={handleNotificationSave} />
            </div>
          ) : null}

          {activeTab === "security" ? (
            <div className="space-y-6">
              <SettingsPanel title="Change Password" description="Use your current password to confirm this security change.">
                <div className="grid gap-4 md:grid-cols-3">
                  <PasswordInput value={passwordForm.currentPassword} visible={showPasswords.currentPassword} placeholder="Current password" onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} onToggleVisibility={() => setShowPasswords((current) => ({ ...current, currentPassword: !current.currentPassword }))} />
                  <PasswordInput value={passwordForm.newPassword} visible={showPasswords.newPassword} placeholder="New password" onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} onToggleVisibility={() => setShowPasswords((current) => ({ ...current, newPassword: !current.newPassword }))} />
                  <PasswordInput value={passwordForm.confirmPassword} visible={showPasswords.confirmPassword} placeholder="Confirm new password" onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} onToggleVisibility={() => setShowPasswords((current) => ({ ...current, confirmPassword: !current.confirmPassword }))} />
                </div>
                {passwordMessage ? <FeedbackMessage state={passwordState} message={passwordMessage} /> : null}
              </SettingsPanel>

              <div className="grid gap-4 md:grid-cols-3">
                <PlaceholderCard title="Two-factor authentication" description="Extra login protection will be available here." />
                <PlaceholderCard title="Active sessions" description="Review connected devices in a future update." />
                <PlaceholderCard title="Recent login activity" description="Security history will appear in this space." />
              </div>

                <SettingsPanel title="Creator Guide" description="Restart the guided product tour whenever a creator needs onboarding again.">
                <Button type="button" variant="outline" onClick={handleRestartGuideTour} className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900">
                  Restart Guide Tour
                </Button>
                {profileMessage && saveState !== "error" ? <FeedbackMessage state="saved" message={profileMessage} /> : null}
                </SettingsPanel>

                <SettingsPanel title="Archive Account" description="Revoke access to this account while StreamTip retains financial, KYC, and audit records required for compliance.">
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                    Your public overlay and active session will be disabled immediately. This is not a permanent data erasure; contact support if you need a restoration review.
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Current password">
                      <Input
                        type="password"
                        value={deletePassword}
                        onChange={(event) => setDeletePassword(event.target.value)}
                        autoComplete="current-password"
                        className="border-zinc-700 bg-zinc-950/70 text-white"
                      />
                    </Field>
                    <Field label="Reason (optional)">
                      <Input
                        value={deleteReason}
                        onChange={(event) => setDeleteReason(event.target.value)}
                        placeholder="Why are you leaving?"
                        className="border-zinc-700 bg-zinc-950/70 text-white"
                      />
                    </Field>
                  </div>
                  {deleteMessage ? <FeedbackMessage state={deleteState} message={deleteMessage} /> : null}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={deleteState === "saving"}
                    onClick={handleAccountDeletion}
                    className="border-rose-500/40 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                  >
                    {deleteState === "saving" ? "Archiving account..." : "Archive my account"}
                  </Button>
                </SettingsPanel>

                <TabSaveBar disabled={passwordState === "saving" || !passwordDirty} state={passwordState} idleLabel="Save Changes" savingLabel="Updating..." savedLabel="Updated" onSave={handlePasswordSave} />
            </div>
          ) : null}
        </motion.section>
      </AnimatePresence>
    </div>
  )
}

function SettingsPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 p-5 sm:p-6">
      <div className="mb-5 space-y-1">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  icon: Icon,
  help,
  children,
}: {
  label: string
  icon?: ElementType
  help?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
        {Icon ? <Icon className="h-4 w-4 text-zinc-500" /> : null}
        {label}
        {help ? <HelpTip content={help} /> : null}
      </label>
      {children}
    </div>
  )
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-950/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function VerificationBadge({ status }: { status?: string }) {
  return (
    <p className={cn("inline-flex rounded-full border px-3 py-1 text-xs", getVerificationClass(status))}>
      {getVerificationLabel(status)}
    </p>
  )
}

function FeedbackMessage({ state, message }: { state: SaveState; message: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        state === "error"
          ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
      )}
    >
      {message}
    </div>
  )
}

function TabSaveBar({
  note,
  disabled,
  state,
  idleLabel,
  savingLabel = "Saving...",
  savedLabel = "Saved",
  onSave,
}: {
  note?: string
  disabled: boolean
  state: SaveState
  idleLabel: string
  savingLabel?: string
  savedLabel?: string
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-4 z-20 rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {note ? <p className="text-sm text-zinc-500">{note}</p> : <span />}
        <Button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className={cn(
            "min-w-[156px]",
            state === "saved"
              ? "bg-emerald-600 text-white hover:bg-emerald-600"
              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90",
          )}
        >
          {state === "saving" ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {savingLabel}
            </span>
          ) : state === "saved" ? (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {savedLabel}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {idleLabel}
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}

function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800">
        <ShieldCheck className="h-5 w-5 text-zinc-400" />
      </div>
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </div>
  )
}

function SoundSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: NotificationSoundId
  onChange: (value: NotificationSoundId) => void
}) {
  return (
    <Field label={label} icon={Volume2}>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as NotificationSoundId)}>
        <SelectTrigger className="border-zinc-700 bg-zinc-950/70 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-zinc-800 bg-zinc-900">
          {notificationSoundOptions.map((option) => (
            <SelectItem key={option.id} value={option.id} className="text-white focus:bg-zinc-800 focus:text-white">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
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

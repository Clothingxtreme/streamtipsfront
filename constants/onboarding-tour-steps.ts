export type CreatorOnboardingStepKey =
  | "sidebar"
  | "dashboard"
  | "donations"
  | "earnings"
  | "virtual-account"
  | "overlay-settings"
  | "custom-gift"
  | "notifications"
  | "upgrade-tier"
  | "settings"
  | "ready"

export type CreatorOnboardingStepDefinition = {
  key: CreatorOnboardingStepKey
  title: string
  text: string
  route?: string
  selector?: string
  position?: "top" | "right" | "bottom" | "left" | "center"
  sidebarStep?: boolean
}

export const creatorOnboardingStepDefinitions: CreatorOnboardingStepDefinition[] = [
  {
    key: "sidebar",
    route: "/dashboard",
    selector: "sidebar",
    sidebarStep: true,
    position: "right",
    title: "Your Creator Control Center",
    text: "Use this sidebar to navigate through your StreamTip creator tools and manage your account easily.",
  },
  {
    key: "dashboard",
    route: "/dashboard",
    selector: "dashboard-main",
    position: "bottom",
    title: "Dashboard Overview",
    text: "View your account summary, recent activity, donations, and creator statistics in one place.",
  },
  {
    key: "donations",
    route: "/dashboard/donations",
    selector: "donations-main",
    position: "bottom",
    title: "Donation Management",
    text: "Track all incoming donations, donor activity, and transaction records here.",
  },
  {
    key: "earnings",
    route: "/dashboard/earnings",
    selector: "earnings-main",
    position: "bottom",
    title: "Earnings & Withdrawals",
    text: "Monitor your earnings, available balance, and payout history anytime.",
  },
  {
    key: "virtual-account",
    route: "/dashboard/account",
    selector: "virtual-account-main",
    position: "bottom",
    title: "Your Donation Account",
    text: "Access your dedicated virtual account details to receive direct donations from supporters.",
  },
  {
    key: "overlay-settings",
    route: "/dashboard/overlay",
    selector: "overlay-settings-main",
    position: "bottom",
    title: "Stream Overlay Setup",
    text: "Customize donation alerts and overlays to display on your live streams.",
  },
  {
    key: "custom-gift",
    route: "/dashboard/custom-gifts",
    selector: "custom-gift-main",
    position: "bottom",
    title: "Create Custom Gifts",
    text: "Design personalized gift options your audience can send during streams.",
  },
  {
    key: "notifications",
    route: "/dashboard/notifications",
    selector: "notifications-main",
    position: "bottom",
    title: "Stay Updated",
    text: "Receive important updates about donations, payouts, and account activity.",
  },
  {
    key: "upgrade-tier",
    route: "/dashboard/kyc-upgrade",
    selector: "upgrade-tier-main",
    position: "bottom",
    title: "Increase Your Limits",
    text: "Upgrade your account tier to unlock higher transaction and withdrawal limits.",
  },
  {
    key: "settings",
    route: "/dashboard/settings",
    selector: "settings-main",
    position: "bottom",
    title: "Account Settings",
    text: "Manage your profile, security preferences, and account configurations.",
  },
  {
    key: "ready",
    route: "/dashboard/settings",
    position: "center",
    title: "You're Ready \u{1F680}",
    text: "Explore your dashboard and start receiving support from your audience instantly.",
  },
]

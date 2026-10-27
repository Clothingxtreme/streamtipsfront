"use client"

import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  BarChart3,
  Wallet, 
  History, 
  Settings, 
  CreditCard,
  Bell,
  ShieldCheck,
  Sparkles,
  Link2,
  Wand2,
  LogOut,
  Menu,
  PlayCircle,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/app/context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { VideoGuideLibraryButton } from "@/components/dashboard/video-guide-card"
import { STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT } from "@/hooks/use-onboarding-tour"
import { earnMoreGuide, setupTutorialGuide } from "@/lib/video-guides"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  tourKey: string
}

// Same destinations, icons and tour keys as before, grouped so related pages sit together.
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, tourKey: "dashboard" }],
  },
  {
    label: "Activity",
    items: [
      { label: "Donations", href: "/dashboard/donations", icon: History, tourKey: "donations" },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, tourKey: "analytics" },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Earnings", href: "/dashboard/earnings", icon: Wallet, tourKey: "earnings" },
      { label: "Virtual Account", href: "/dashboard/account", icon: CreditCard, tourKey: "virtual-account" },
      { label: "Referrals", href: "/dashboard/rewards", icon: Link2, tourKey: "creator-referrals" },
    ],
  },
  {
    label: "Stream setup",
    items: [
      { label: "Overlay Settings", href: "/dashboard/overlay", icon: Sparkles, tourKey: "overlay-settings" },
      { label: "Create Custom Gift", href: "/dashboard/custom-gifts", icon: Wand2, tourKey: "custom-gift" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Upgrade Tier", href: "/dashboard/kyc-upgrade", icon: ShieldCheck, tourKey: "upgrade-tier" },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell, tourKey: "notifications" },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, tourKey: "settings" },
    ],
  },
]

function NavGroupLabel({ label, collapsed }: { label: string; collapsed?: boolean }) {
  if (collapsed) {
    return <div className="mx-3 my-2 h-px bg-zinc-800" aria-hidden />
  }
  return (
    <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{label}</p>
  )
}

type DashboardSidebarProps = {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

export function DashboardSidebar({ mobileOpen, onMobileOpenChange }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { logout, user } = useAuth()
  const tutorialGuides = [setupTutorialGuide, earnMoreGuide]

  const restartGuideTour = () => {
    window.dispatchEvent(new CustomEvent(STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT))
  }

  useEffect(() => {
    onMobileOpenChange(false)
  }, [pathname, onMobileOpenChange])

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => onMobileOpenChange(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
          aria-label="Open dashboard menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">StreamTips</span>
        </div>
        <div className="h-9 w-9" />
      </div>

      <aside className={cn(
        "hidden h-screen sticky top-0 md:flex flex-col bg-zinc-950 border-r border-zinc-800 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )} data-tour="sidebar">
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-white">StreamTips</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto dashboard-scrollbar">
          <VideoGuideLibraryButton guides={tutorialGuides}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 border border-cyan-500/20",
              )}
            >
              <PlayCircle className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Tutorial Videos</span>}
            </button>
          </VideoGuideLibraryButton>

          {navGroups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="space-y-1">
              <NavGroupLabel label={group.label} collapsed={collapsed} />
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-tour={item.tourKey}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                      "hover:bg-zinc-800/80 outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60",
                      isActive
                        ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 shrink-0",
                      isActive && "text-purple-400"
                    )} />
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}

          <button
            type="button"
            onClick={restartGuideTour}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 border border-cyan-500/20",
            )}
          >
            <Sparkles className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Guide Tour</span>}
          </button>
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-zinc-800 space-y-1">
          {!collapsed && user ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-3 text-sm text-zinc-400">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-zinc-700">
                  <AvatarImage src={user.profileImage || ""} alt={user.name} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {user.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{user.name}</p>
                  <p className="truncate text-xs text-zinc-500">{user.email}</p>
                </div>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => {
              void logout().then(() => router.replace("/login"))
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-all duration-200",
              "text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center gap-3 px-3 py-2 rounded-lg w-full transition-all duration-200 text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close dashboard menu backdrop"
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[84vw] max-w-[320px] flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl"
            data-tour-mobile="sidebar"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-base font-semibold text-white">StreamTips</span>
              </div>
              <button
                type="button"
                onClick={() => onMobileOpenChange(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                aria-label="Close dashboard menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3 dashboard-scrollbar">
              <VideoGuideLibraryButton guides={tutorialGuides}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 border border-cyan-500/20",
                  )}
                >
                  <PlayCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Tutorial Videos</span>
                </button>
              </VideoGuideLibraryButton>

              {navGroups.map((group) => (
                <div key={group.label} role="group" aria-label={group.label} className="space-y-1">
                  <NavGroupLabel label={group.label} />
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-tour-mobile={item.tourKey}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                          "hover:bg-zinc-800/80 outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60",
                          isActive
                            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                            : "text-zinc-400 hover:text-white"
                        )}
                        onClick={() => onMobileOpenChange(false)}
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-purple-400")} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  restartGuideTour()
                  onMobileOpenChange(false)
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 border border-cyan-500/20",
                )}
              >
                <Sparkles className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Guide Tour</span>
              </button>
            </nav>

            <div className="space-y-2 border-t border-zinc-800 p-3">
              {user ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-3 text-sm text-zinc-400">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-zinc-700">
                      <AvatarImage src={user.profileImage || ""} alt={user.name} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {user.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{user.name}</p>
                      <p className="truncate text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => {
                  onMobileOpenChange(false)
                  void logout().then(() => router.replace("/login"))
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-zinc-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}

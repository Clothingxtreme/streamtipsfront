"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { SafeCreatorGuideTour } from "@/components/onboarding/safe-creator-guide-tour"
import { useAuth } from "@/app/context/AuthContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-6 py-5">
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 overflow-x-hidden">
      <SafeCreatorGuideTour mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen}>
        <DashboardSidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
        <main className="flex-1 overflow-y-auto dashboard-scrollbar pt-14 md:pt-0">
          {children}
        </main>
      </SafeCreatorGuideTour>
    </div>
  )
}

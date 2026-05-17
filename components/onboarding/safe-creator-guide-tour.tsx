"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { useEffect, useState } from "react"

type CreatorGuideTourProps = {
  children: ReactNode
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

type LoadedTourComponent = (props: CreatorGuideTourProps) => ReactNode

type TourErrorBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
}

type TourErrorBoundaryState = {
  hasError: boolean
}

const TOUR_DISABLED_KEY = "streamtip_onboarding_tour_disabled_v2"

class TourErrorBoundary extends Component<TourErrorBoundaryProps, TourErrorBoundaryState> {
  state: TourErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOUR_DISABLED_KEY, "true")
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export function SafeCreatorGuideTour({
  children,
  mobileOpen,
  onMobileOpenChange,
}: CreatorGuideTourProps) {
  const [TourComponent, setTourComponent] = useState<LoadedTourComponent | null>(null)
  const [tourDisabled, setTourDisabled] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("streamtip_onboarding_tour_disabled")
      const disabledByClient = window.localStorage.getItem(TOUR_DISABLED_KEY) === "true"
      if (disabledByClient) {
        setTourDisabled(true)
        return
      }
    }

    let active = true
    void import("./creator-guide-tour")
      .then((module) => {
        if (!active) return
        setTourComponent(() => module.CreatorGuideTour as LoadedTourComponent)
      })
      .catch(() => {
        if (!active) return
        setTourDisabled(true)
        if (typeof window !== "undefined") {
          window.localStorage.setItem(TOUR_DISABLED_KEY, "true")
        }
      })

    return () => {
      active = false
    }
  }, [])

  if (tourDisabled || !TourComponent) {
    return <>{children}</>
  }

  return (
    <TourErrorBoundary fallback={children}>
      <TourComponent mobileOpen={mobileOpen} onMobileOpenChange={onMobileOpenChange}>
        {children}
      </TourComponent>
    </TourErrorBoundary>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  creatorOnboardingStepDefinitions,
  type CreatorOnboardingStepDefinition,
} from "@/constants/onboarding-tour-steps"
import {
  STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT,
  useOnboardingTour,
} from "@/hooks/use-onboarding-tour"
import { useAuth } from "@/app/context/AuthContext"

type CreatorGuideTourProps = {
  children: ReactNode
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  blocked?: boolean
}

type GuidedStep = CreatorOnboardingStepDefinition & {
  selectorQuery: string
  narration: string
}

type RectBox = {
  top: number
  left: number
  width: number
  height: number
}

const TOUR_COMPLETED_EVENT = "streamtip:onboarding-tour:completed"
const FEMALE_VOICE_HINT =
  /(female|zira|samantha|victoria|karen|moira|ava|allison|joanna|aria|jenny|susan|sara|catrine|natasha|hazel|luna|aria|zoe|amy|emma)/i
const MALE_VOICE_HINT = /(male|david|mark|james|daniel|alex|tom|fred|george|oliver)/i
let speechRequestCounter = 0

function isMobileViewport() {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia("(max-width: 767px)").matches
}

function buildSelector(step: CreatorOnboardingStepDefinition, mobile: boolean) {
  if (!step.selector) {
    return ""
  }

  if (mobile && step.sidebarStep) {
    return `[data-tour-mobile="${step.selector}"]`
  }

  return `[data-tour="${step.selector}"]`
}

function stopTourVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return
  }

  try {
    speechRequestCounter += 1
    window.speechSynthesis.cancel()
  } catch {
    // no-op
  }
}

function scoreVoice(voice: SpeechSynthesisVoice) {
  const signature = `${voice.name} ${voice.voiceURI}`.toLowerCase()
  let score = 0

  if (FEMALE_VOICE_HINT.test(signature)) score += 12
  if (MALE_VOICE_HINT.test(signature)) score -= 8
  if (String(voice.lang || "").toLowerCase().startsWith("en")) score += 3
  if (voice.default) score += 1

  return score
}

function getBestVoice(voices: SpeechSynthesisVoice[]) {
  if (!voices.length) return null
  return [...voices].sort((left, right) => scoreVoice(right) - scoreVoice(left))[0] || null
}

function waitForVoices(timeoutMs = 1200) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve<SpeechSynthesisVoice[]>([])
  }

  const synth = window.speechSynthesis
  const immediate = synth.getVoices()
  if (immediate.length) {
    return Promise.resolve(immediate)
  }

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let finished = false

    const cleanup = () => {
      if (finished) return
      finished = true
      synth.onvoiceschanged = null
      window.clearTimeout(timer)
    }

    const finalize = () => {
      cleanup()
      resolve(synth.getVoices())
    }

    const timer = window.setTimeout(finalize, timeoutMs)
    synth.onvoiceschanged = finalize
  })
}

async function speakTourVoice(text: string) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof window.SpeechSynthesisUtterance !== "function"
  ) {
    return
  }

  const message = String(text || "").trim()
  if (!message) {
    return
  }

  const requestToken = ++speechRequestCounter

  try {
    window.speechSynthesis.cancel()
    const voices = await waitForVoices()
    if (requestToken !== speechRequestCounter) {
      return
    }

    const utterance = new window.SpeechSynthesisUtterance(message)
    const preferredVoice = getBestVoice(voices)
    if (preferredVoice) {
      utterance.voice = preferredVoice
      utterance.lang = preferredVoice.lang || "en-US"
    } else {
      utterance.lang = "en-US"
    }
    utterance.rate = 0.95
    utterance.pitch = 1.12
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  } catch {
    // no-op
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getViewportRect() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 }
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function getTargetRect(selectorQuery: string): RectBox | null {
  if (typeof window === "undefined" || !selectorQuery) {
    return null
  }

  const element = document.querySelector(selectorQuery)
  if (!element) {
    return null
  }

  const rect = element.getBoundingClientRect()
  if (!rect.width && !rect.height) {
    return null
  }

  const padding = 8
  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

function getPopoverStyle(rect: RectBox | null, position: GuidedStep["position"]): CSSProperties {
  const viewport = getViewportRect()
  const maxWidth = Math.min(420, Math.max(280, viewport.width - 24))

  if (!rect || position === "center") {
    return {
      width: maxWidth,
      maxWidth: "calc(100vw - 24px)",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    }
  }

  const gutter = 12
  let top = rect.top
  let left = rect.left

  if (position === "right") {
    left = rect.left + rect.width + gutter
  } else if (position === "left") {
    left = rect.left - maxWidth - gutter
  } else if (position === "bottom") {
    top = rect.top + rect.height + gutter
  } else {
    top = rect.top - 170 - gutter
  }

  top = clamp(top, 8, Math.max(8, viewport.height - 220))
  left = clamp(left, 8, Math.max(8, viewport.width - maxWidth - 8))

  return {
    width: maxWidth,
    maxWidth: "calc(100vw - 24px)",
    top,
    left,
  }
}

export function CreatorGuideTour({
  children,
  mobileOpen,
  onMobileOpenChange,
  blocked = false,
}: CreatorGuideTourProps) {
  const router = useRouter()
  const { user, setUser } = useAuth()
  const pathname = usePathname()
  const { shouldAutoStartTour, markTourCompleted } = useOnboardingTour()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<RectBox | null>(null)
  const autoStartedRef = useRef(false)

  const steps = useMemo<GuidedStep[]>(() => {
    const mobile = isMobileViewport()

    return creatorOnboardingStepDefinitions.map((step, index) => ({
      ...step,
      selectorQuery: buildSelector(step, mobile),
      narration:
        index === 0
          ? `Welcome to StreamTip. ${step.title}. ${step.text}`
          : `${step.title}. ${step.text}`,
    }))
  }, [])

  const activeStep = steps[currentStep] || steps[0]
  const isFirst = currentStep <= 0
  const isLast = currentStep >= steps.length - 1

  useEffect(() => {
    autoStartedRef.current = false
  }, [user?.id])

  useEffect(() => {
    if (!blocked || !isOpen) {
      return
    }

    setIsOpen(false)
    stopTourVoice()

    if (shouldAutoStartTour(user)) {
      autoStartedRef.current = false
    }
  }, [blocked, isOpen, shouldAutoStartTour, user])

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) {
      setIsOpen(false)
      return
    }

    if (blocked) {
      return
    }

    if (!user || user.role !== "creator" || autoStartedRef.current) {
      return
    }

    if (!shouldAutoStartTour(user)) {
      autoStartedRef.current = true
      return
    }

    autoStartedRef.current = true
    setCurrentStep(0)

    if (isMobileViewport()) {
      onMobileOpenChange(true)
      window.setTimeout(() => setIsOpen(true), 220)
      return
    }

    setIsOpen(true)
  }, [blocked, onMobileOpenChange, pathname, shouldAutoStartTour, user])

  useEffect(() => {
    const handleRestart = () => {
      if (blocked) {
        return
      }

      setCurrentStep(0)

      if (isMobileViewport()) {
        onMobileOpenChange(true)
        window.setTimeout(() => setIsOpen(true), 220)
        return
      }

      setIsOpen(true)
    }

    window.addEventListener(STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT, handleRestart)
    return () => window.removeEventListener(STREAMTIP_ONBOARDING_TOUR_RESTART_EVENT, handleRestart)
  }, [blocked, onMobileOpenChange])

  useEffect(() => {
    if (!isOpen || !isMobileViewport()) {
      return
    }

    if (activeStep?.sidebarStep && !mobileOpen) {
      onMobileOpenChange(true)
    }
  }, [activeStep?.sidebarStep, isOpen, mobileOpen, onMobileOpenChange])

  useEffect(() => {
    if (!isOpen || !activeStep?.route) {
      return
    }

    if (pathname !== activeStep.route) {
      router.push(activeStep.route)
    }
  }, [activeStep?.route, isOpen, pathname, router])

  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null)
      return
    }

    const updateTarget = () => {
      if (!activeStep?.selectorQuery) {
        setTargetRect(null)
        return
      }

      const rect = getTargetRect(activeStep.selectorQuery)
      setTargetRect(rect)
    }

    updateTarget()
    const timer = window.setTimeout(updateTarget, 240)
    window.addEventListener("resize", updateTarget)
    window.addEventListener("scroll", updateTarget, true)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("resize", updateTarget)
      window.removeEventListener("scroll", updateTarget, true)
    }
  }, [activeStep?.selectorQuery, isOpen])

  useEffect(() => {
    if (!isOpen) {
      stopTourVoice()
      return
    }

    void speakTourVoice(activeStep?.narration || "")
  }, [activeStep?.narration, isOpen])

  useEffect(() => () => stopTourVoice(), [])

  const completeTour = async () => {
    setIsOpen(false)
    stopTourVoice()

    if (isMobileViewport()) {
      onMobileOpenChange(false)
    }

    await markTourCompleted(user)

    if (user) {
      setUser({
        ...user,
        onboardingTourCompleted: true,
        onboardingTourCompletedAt: new Date().toISOString(),
      })
    }

    window.dispatchEvent(new CustomEvent(TOUR_COMPLETED_EVENT))
  }

  const skipTour = async () => {
    await completeTour()
  }

  const nextStep = async () => {
    if (isLast) {
      await completeTour()
      return
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
  }

  const backStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 0))
  }

  const popoverStyle = getPopoverStyle(targetRect, activeStep?.position || "right")

  return (
    <>
      {children}

      {isOpen ? (
        <div className="fixed inset-0 z-[120]">
          <div className="fixed inset-0 bg-black/70" />

          {targetRect ? (
            <>
              <div
                className="fixed bg-black/70"
                style={{ top: 0, left: 0, width: "100vw", height: targetRect.top }}
              />
              <div
                className="fixed bg-black/70"
                style={{ top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height }}
              />
              <div
                className="fixed bg-black/70"
                style={{
                  top: targetRect.top,
                  left: targetRect.left + targetRect.width,
                  width: `calc(100vw - ${targetRect.left + targetRect.width}px)`,
                  height: targetRect.height,
                }}
              />
              <div
                className="fixed bg-black/70"
                style={{
                  top: targetRect.top + targetRect.height,
                  left: 0,
                  width: "100vw",
                  height: `calc(100vh - ${targetRect.top + targetRect.height}px)`,
                }}
              />

              <div
                className="pointer-events-none fixed rounded-2xl border-2 border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_0_30px_rgba(34,211,238,0.22)]"
                style={{
                  top: targetRect.top,
                  left: targetRect.left,
                  width: targetRect.width,
                  height: targetRect.height,
                }}
              />
            </>
          ) : null}

          <div
            className="fixed rounded-2xl border border-zinc-700 bg-slate-900 p-4 text-zinc-100 shadow-[0_24px_60px_rgba(2,6,23,0.55)]"
            style={popoverStyle}
          >
            <div className="space-y-2">
              <h3 className="text-base font-semibold leading-tight text-white">{activeStep?.title}</h3>
              <p className="text-sm leading-6 text-zinc-300">{activeStep?.text}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  void skipTour()
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                Skip
              </button>

              <div className="flex items-center gap-2">
                {!isFirst ? (
                  <button
                    type="button"
                    onClick={backStep}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
                  >
                    Back
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    void nextStep()
                  }}
                  className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {isLast ? "Finish Tour" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

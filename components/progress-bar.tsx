"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Sparkles, Target } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

interface ProgressBarProps {
  currentAmount: number
  goalAmount: number
  title?: string
  showPercentage?: boolean
  showAmount?: boolean
  className?: string
  accentColor?: string
  compact?: boolean
  playCompletionSound?: boolean
}

export function ProgressBar({
  currentAmount,
  goalAmount,
  title = "Donation Goal",
  showPercentage = true,
  showAmount = true,
  className,
  accentColor = "#00C3F7",
  compact = false,
  playCompletionSound = false,
}: ProgressBarProps) {
  const safeGoalAmount = Math.max(goalAmount, 1)
  const percentage = Math.min((currentAmount / safeGoalAmount) * 100, 100)
  const prevAmountRef = useRef(currentAmount)
  const wasCompletedRef = useRef(percentage >= 100)
  const [isGlowing, setIsGlowing] = useState(false)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    let animationFrame = 0
    const startTime = performance.now()
    const startValue = animatedPercentage
    const duration = 800

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = startValue + (percentage - startValue) * eased

      setAnimatedPercentage(Math.round(nextValue))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [animatedPercentage, percentage])

  useEffect(() => {
    if (currentAmount > prevAmountRef.current) {
      setIsGlowing(true)
      const timer = window.setTimeout(() => setIsGlowing(false), 1400)
      prevAmountRef.current = currentAmount
      return () => window.clearTimeout(timer)
    }

    prevAmountRef.current = currentAmount
  }, [currentAmount])

  useEffect(() => {
    const completed = percentage >= 100

    if (completed && !wasCompletedRef.current) {
      setIsCelebrating(true)
      if (playCompletionSound) {
        try {
          const browserWindow = window as BrowserWindow
          const AudioContextClass = browserWindow.AudioContext || browserWindow.webkitAudioContext
          if (AudioContextClass) {
            const context = new AudioContextClass()
            const now = context.currentTime
            ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
              const oscillator = context.createOscillator()
              const gainNode = context.createGain()

              oscillator.type = "triangle"
              oscillator.frequency.setValueAtTime(frequency, now + index * 0.08)
              gainNode.gain.setValueAtTime(0.0001, now + index * 0.08)
              gainNode.gain.exponentialRampToValueAtTime(0.08, now + index * 0.08 + 0.03)
              gainNode.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.55)

              oscillator.connect(gainNode)
              gainNode.connect(context.destination)
              oscillator.start(now + index * 0.08)
              oscillator.stop(now + index * 0.08 + 0.58)
            })
            window.setTimeout(() => {
              void context.close()
            }, 900)
          }
        } catch {
          // Browsers can block audio in passive overlays; visuals still complete the goal moment.
        }
      }
      const timer = window.setTimeout(() => setIsCelebrating(false), 4200)
      wasCompletedRef.current = true
      return () => window.clearTimeout(timer)
    }

    if (!completed) {
      wasCompletedRef.current = false
    }
  }, [percentage, playCompletionSound])

  return (
    <div className={cn("relative w-full", className)}>
      {isCelebrating ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          {Array.from({ length: 18 }).map((_, index) => (
            <motion.span
              key={`goal-confetti-${index}`}
              initial={{ opacity: 0, y: 4, scale: 0.4, rotate: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-4, -44 - (index % 4) * 8],
                x: (index - 9) * 8,
                scale: [0.4, 1, 0.7],
                rotate: 120 + index * 18,
              }}
              transition={{ duration: 1.6, delay: index * 0.025, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 h-2 w-2 rounded-sm"
              style={{ background: index % 3 === 0 ? accentColor : index % 3 === 1 ? "#facc15" : "#ffffff" }}
            />
          ))}
        </div>
      ) : null}

      <div className={cn("flex items-center justify-between gap-4", compact ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-2 text-white">
          {percentage >= 100 ? (
            <CheckCircle2 className={cn(compact ? "h-4 w-4" : "h-5 w-5")} style={{ color: accentColor }} />
          ) : (
            <Target className={cn(compact ? "h-4 w-4" : "h-5 w-5")} style={{ color: accentColor }} />
          )}
          <span className="font-semibold">{title}</span>
          {isGlowing ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </motion.div>
          ) : null}
        </div>

        {showAmount ? (
          <div className="flex items-center gap-2 text-white">
            <motion.span
              key={currentAmount}
              initial={{ scale: 1.12, color: accentColor }}
              animate={{ scale: 1, color: accentColor }}
              className={cn("font-black", compact ? "text-sm" : "text-xl")}
            >
              ₦{currentAmount.toLocaleString()}
            </motion.span>
            <span className="text-white/45">/</span>
            <span className={cn("font-medium text-white/70", compact ? "text-xs" : "text-sm")}>
              ₦{safeGoalAmount.toLocaleString()}
            </span>
          </div>
        ) : null}
      </div>

      {percentage >= 100 ? (
        <motion.p
          initial={isCelebrating ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          className={cn("mb-2 font-black uppercase tracking-[0.22em] text-white", compact ? "text-[10px]" : "text-xs")}
        >
          Goal Completed
        </motion.p>
      ) : null}

      <div className={cn("relative overflow-hidden rounded-full border border-white/16 bg-black/25 backdrop-blur-md", compact ? "h-3" : "h-6")}>
        <motion.div
          animate={{
            opacity: isGlowing ? [0.45, 0.9, 0.45] : 0.35,
          }}
          transition={{
            duration: isGlowing ? 0.55 : 2,
            repeat: isGlowing ? 2 : Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/20 via-fuchsia-400/20 to-amber-300/20"
        />

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 55, damping: 15 }}
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full"
          style={{
            boxShadow: isGlowing
              ? `0 0 20px ${accentColor}80, 0 0 40px ${accentColor}38`
              : `0 0 12px ${accentColor}45`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, ${accentColor}, #ffffff, ${accentColor})`,
            }}
          />
          <motion.div
            animate={{ x: ["-100%", "160%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
          />
        </motion.div>

        {showPercentage ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-black tracking-[0.22em] text-white", compact ? "text-[9px]" : "text-xs")}>
              {animatedPercentage}%
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

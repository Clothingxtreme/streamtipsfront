"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import type { GiftAnimationType } from "@/lib/custom-gifts"

export const STREAMTIP_ANIMATION_STYLE_STORAGE_KEY = "streamtip.animation.style"

type CinematicFamily =
  | "lion"
  | "whale"
  | "fire"
  | "water"
  | "cosmic"
  | "luxury"
  | "stage"
  | "sky"
  | "ice"
  | "royal"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  spin: number
  hue: number
  life: number
  born: number
  shape: "spark" | "smoke" | "splash" | "flare" | "shard" | "coin"
}

type CinematicGiftEngineProps = {
  animationType?: GiftAnimationType
  giftName: string
  amount: number
  comboCount: number
  isVisible: boolean
  accentA: string
  accentB: string
  accentC: string
}

const LOW_END_PARTICLE_COUNT = 72
const DEFAULT_PARTICLE_COUNT = 150
const HUGE_GIFT_PARTICLE_COUNT = 220
const DURATION_MS = 6200

const cinematicFamilies: Partial<Record<GiftAnimationType, CinematicFamily>> = {
  "rose-bloom": "luxury",
  "heart-pulse": "luxury",
  "confetti-burst": "stage",
  "money-cannon": "luxury",
  "disco-spin": "stage",
  "mermaid-wave": "water",
  "airplane-flyover": "sky",
  "planet-orbit": "cosmic",
  "diamond-storm": "luxury",
  "lion-roar": "lion",
  "universe-rift": "cosmic",
  "vip-spotlight": "stage",
  starfall: "cosmic",
  "neon-comet": "cosmic",
  "aurora-glow": "sky",
  "thunder-drop": "fire",
  "bubble-pop": "water",
  "pixel-party": "stage",
  "meteor-rush": "fire",
  "laser-sweep": "stage",
  "angel-wings": "sky",
  "petal-rain": "luxury",
  "fire-crown": "fire",
  "ice-shards": "ice",
  "cosmic-ribbon": "cosmic",
  "golden-ring": "royal",
  "rocket-burst": "fire",
  "candy-pop": "stage",
  "halo-rise": "sky",
  "crown-wave": "royal",
  "whale-splash": "whale",
  "dragon-flight": "fire",
  "phoenix-rise": "fire",
  "volcano-burst": "fire",
  "ocean-storm": "water",
  "thunder-lion": "lion",
  "crystal-shatter": "ice",
  "gold-rush": "luxury",
  "moon-eclipse": "cosmic",
  "solar-flare": "fire",
  "city-lights": "stage",
  "cyber-car": "stage",
  "butterfly-storm": "luxury",
  "royal-carriage": "royal",
  "samurai-slash": "stage",
  "dj-stage": "stage",
  "rainbow-whale": "whale",
  "comet-impact": "cosmic",
  "ice-dragon": "ice",
  "mega-fireworks": "stage",
}

function hashSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number) {
  let state = seed || 1
  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return ((state >>> 0) % 10000) / 10000
  }
}

function resolvePerformanceMode() {
  if (typeof window === "undefined") {
    return { enabled: false, lowEnd: true }
  }

  const storedStyle = window.localStorage.getItem(STREAMTIP_ANIMATION_STYLE_STORAGE_KEY)
  if (storedStyle === "legacy") {
    return { enabled: false, lowEnd: true }
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (prefersReducedMotion) {
    return { enabled: false, lowEnd: true }
  }

  const nav = navigator as Navigator & { deviceMemory?: number }
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 3
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4
  const mobile = window.matchMedia("(max-width: 720px)").matches

  return {
    enabled: true,
    lowEnd: lowMemory || lowCpu || mobile,
  }
}

function makeParticles({
  family,
  count,
  width,
  height,
  seed,
}: {
  family: CinematicFamily
  count: number
  width: number
  height: number
  seed: number
}) {
  const random = seededRandom(seed)
  const centerX = width / 2
  const centerY = height / 2
  const particles: Particle[] = []

  for (let index = 0; index < count; index += 1) {
    const angle = random() * Math.PI * 2
    const speed = 0.35 + random() * 2.4
    const water = family === "water" || family === "whale"
    const fire = family === "fire" || family === "lion"
    const ice = family === "ice"
    const shape =
      water ? "splash" : fire ? (random() > 0.72 ? "smoke" : "flare") : ice ? "shard" : random() > 0.76 ? "coin" : "spark"

    particles.push({
      x: centerX + (random() - 0.5) * width * 0.72,
      y: family === "whale" || family === "water" ? height * (0.58 + random() * 0.32) : centerY + (random() - 0.5) * height * 0.54,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (water ? random() * 1.7 : 0),
      size: 2 + random() * (water ? 12 : fire ? 18 : 10),
      spin: random() * Math.PI,
      hue: water ? 185 + random() * 70 : fire ? 28 + random() * 38 : ice ? 190 + random() * 45 : 255 + random() * 100,
      life: 0.55 + random() * 0.42,
      born: random() * 0.42,
      shape,
    })
  }

  return particles
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle, progress: number, accent: string) {
  const age = Math.max(0, progress - particle.born)
  const normalized = Math.min(1, age / particle.life)
  if (normalized <= 0 || normalized >= 1) return

  const fade = Math.sin(normalized * Math.PI)
  const x = particle.x + particle.vx * normalized * 280
  const y = particle.y + particle.vy * normalized * 240 + normalized * normalized * 120
  const size = particle.size * (1 - normalized * 0.36)

  ctx.save()
  ctx.globalAlpha = fade * (particle.shape === "smoke" ? 0.22 : 0.88)
  ctx.translate(x, y)
  ctx.rotate(particle.spin + normalized * 4)

  if (particle.shape === "smoke") {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 3.4)
    gradient.addColorStop(0, "rgba(255,255,255,0.28)")
    gradient.addColorStop(1, "rgba(20,20,24,0)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, size * 3.4, 0, Math.PI * 2)
    ctx.fill()
  } else if (particle.shape === "splash") {
    ctx.strokeStyle = `hsla(${particle.hue}, 90%, 68%, 0.88)`
    ctx.lineWidth = Math.max(1, size / 3)
    ctx.beginPath()
    ctx.moveTo(-size, size * 0.4)
    ctx.quadraticCurveTo(0, -size * 1.4, size, size * 0.4)
    ctx.stroke()
  } else if (particle.shape === "shard") {
    ctx.fillStyle = `hsla(${particle.hue}, 95%, 78%, 0.86)`
    ctx.beginPath()
    ctx.moveTo(0, -size * 1.5)
    ctx.lineTo(size * 0.7, 0)
    ctx.lineTo(0, size * 1.4)
    ctx.lineTo(-size * 0.7, 0)
    ctx.closePath()
    ctx.fill()
  } else if (particle.shape === "coin") {
    ctx.fillStyle = "rgba(251,191,36,0.9)"
    ctx.shadowColor = "rgba(251,191,36,0.8)"
    ctx.shadowBlur = 18
    ctx.beginPath()
    ctx.ellipse(0, 0, size * 0.9, size * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = accent
    ctx.shadowColor = accent
    ctx.shadowBlur = 24
    ctx.beginPath()
    ctx.arc(0, 0, size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function drawLion(ctx: CanvasRenderingContext2D, progress: number, width: number, height: number, accent: string) {
  const run = Math.min(progress / 0.34, 1)
  const roar = Math.max(0, Math.min(1, (progress - 0.36) / 0.2))
  const fade = progress > 0.78 ? Math.max(0, 1 - (progress - 0.78) / 0.18) : 1
  const x = -width * 0.2 + run * width * 0.58
  const y = height * 0.54 + Math.sin(progress * Math.PI * 18) * (run < 1 ? 10 : 0)
  const scale = Math.min(width, height) / 660

  ctx.save()
  ctx.globalAlpha = fade
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.shadowColor = "rgba(251,191,36,0.75)"
  ctx.shadowBlur = 46

  const mane = ctx.createRadialGradient(0, 0, 18, 0, 0, 105 + roar * 28)
  mane.addColorStop(0, "#fde68a")
  mane.addColorStop(0.48, "#f59e0b")
  mane.addColorStop(1, "rgba(124,45,18,0.12)")
  ctx.fillStyle = mane
  ctx.beginPath()
  ctx.arc(0, 0, 108 + roar * 22, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#facc15"
  ctx.beginPath()
  ctx.arc(0, 0, 68, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#3b1f0b"
  ctx.beginPath()
  ctx.arc(-22, -14, 7, 0, Math.PI * 2)
  ctx.arc(22, -14, 7, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#7c2d12"
  ctx.beginPath()
  ctx.moveTo(0, 2)
  ctx.lineTo(16, 18)
  ctx.lineTo(-16, 18)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = "#7c2d12"
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(0, 26, 24 + roar * 22, 0.08 * Math.PI, 0.92 * Math.PI)
  ctx.stroke()

  ctx.strokeStyle = accent
  ctx.lineWidth = 9
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.globalAlpha = fade * (0.35 - ring * 0.08) * roar
    ctx.beginPath()
    ctx.arc(0, 28, 126 + ring * 54 + roar * 180, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}

function drawWhale(ctx: CanvasRenderingContext2D, progress: number, width: number, height: number, accent: string) {
  const jump = Math.min(progress / 0.48, 1)
  const dive = Math.max(0, Math.min(1, (progress - 0.58) / 0.3))
  const x = -width * 0.12 + progress * width * 1.22
  const arc = Math.sin(jump * Math.PI) * height * 0.34
  const y = height * 0.72 - arc + dive * height * 0.28
  const scale = Math.min(width, height) / 680

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.22 + progress * 0.42)
  ctx.scale(scale, scale)
  ctx.shadowColor = "rgba(34,211,238,0.75)"
  ctx.shadowBlur = 52

  const body = ctx.createLinearGradient(-145, -40, 150, 64)
  body.addColorStop(0, "#67e8f9")
  body.addColorStop(0.55, "#2563eb")
  body.addColorStop(1, "#0f172a")
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, 0, 162, 74, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "rgba(240,249,255,0.88)"
  ctx.beginPath()
  ctx.ellipse(24, 32, 86, 24, 0.08, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#0f172a"
  ctx.beginPath()
  ctx.arc(88, -24, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#38bdf8"
  ctx.beginPath()
  ctx.moveTo(-146, 0)
  ctx.lineTo(-236, -72)
  ctx.lineTo(-218, 2)
  ctx.lineTo(-240, 72)
  ctx.closePath()
  ctx.fill()

  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.62
  ctx.strokeStyle = accent
  ctx.lineWidth = 5
  for (let wave = 0; wave < 4; wave += 1) {
    ctx.beginPath()
    const waveY = height * (0.74 + wave * 0.035)
    for (let px = 0; px <= width; px += 26) {
      const py = waveY + Math.sin(px * 0.024 + progress * 14 + wave) * 9
      if (px === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawEnergyObject(ctx: CanvasRenderingContext2D, family: CinematicFamily, progress: number, width: number, height: number, accentA: string, accentB: string) {
  const centerX = width / 2
  const centerY = height / 2
  const pulse = Math.sin(progress * Math.PI * 5) * 0.5 + 0.5
  const radius = Math.min(width, height) * (0.16 + pulse * 0.035)

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(progress * Math.PI * (family === "stage" ? 6 : 2))
  ctx.shadowColor = accentA
  ctx.shadowBlur = 64

  if (family === "ice") {
    ctx.fillStyle = "rgba(224,242,254,0.76)"
    for (let shard = 0; shard < 12; shard += 1) {
      ctx.rotate(Math.PI / 6)
      ctx.beginPath()
      ctx.moveTo(0, -radius * 1.2)
      ctx.lineTo(radius * 0.15, -radius * 0.18)
      ctx.lineTo(0, radius * 0.92)
      ctx.lineTo(-radius * 0.15, -radius * 0.18)
      ctx.closePath()
      ctx.fill()
    }
  } else if (family === "royal") {
    ctx.strokeStyle = "rgba(253,224,71,0.9)"
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = "rgba(251,191,36,0.84)"
    ctx.beginPath()
    ctx.moveTo(-radius * 0.72, radius * 0.18)
    ctx.lineTo(-radius * 0.42, -radius * 0.58)
    ctx.lineTo(0, radius * 0.02)
    ctx.lineTo(radius * 0.42, -radius * 0.58)
    ctx.lineTo(radius * 0.72, radius * 0.18)
    ctx.closePath()
    ctx.fill()
  } else {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.8)
    gradient.addColorStop(0, accentA)
    gradient.addColorStop(0.42, accentB)
    gradient.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

function drawScene({
  ctx,
  width,
  height,
  progress,
  particles,
  family,
  accentA,
  accentB,
  accentC,
}: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  progress: number
  particles: Particle[]
  family: CinematicFamily
  accentA: string
  accentB: string
  accentC: string
}) {
  ctx.clearRect(0, 0, width, height)

  const flash = Math.max(0, 1 - Math.abs(progress - 0.42) / 0.16)
  const bg = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.72)
  bg.addColorStop(0, `${accentA}24`)
  bg.addColorStop(0.42, `${accentB}18`)
  bg.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  if (family === "lion") {
    drawLion(ctx, progress, width, height, accentC)
  } else if (family === "whale") {
    drawWhale(ctx, progress, width, height, accentA)
  } else {
    drawEnergyObject(ctx, family, progress, width, height, accentA, accentB)
  }

  particles.forEach((particle) => drawParticle(ctx, particle, progress, accentC))

  if (flash > 0) {
    ctx.save()
    ctx.globalAlpha = flash * 0.18
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}

function dispatchSoundCue(animationType: GiftAnimationType | undefined, cue: string, atMs: number) {
  window.dispatchEvent(
    new CustomEvent("streamtip:gift-sound-cue", {
      detail: {
        animationType,
        cue,
        atMs,
      },
    }),
  )
}

export function CinematicGiftEngine({
  animationType,
  giftName,
  amount,
  comboCount,
  isVisible,
  accentA,
  accentB,
  accentC,
}: CinematicGiftEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const cueTimersRef = useRef<number[]>([])
  const [mode, setMode] = useState({ enabled: false, lowEnd: true })
  const family = cinematicFamilies[animationType || "rose-bloom"] || (amount >= 150000 ? "lion" : "luxury")
  const particleCount = mode.lowEnd ? LOW_END_PARTICLE_COUNT : amount >= 90000 ? HUGE_GIFT_PARTICLE_COUNT : DEFAULT_PARTICLE_COUNT
  const seed = useMemo(
    () => hashSeed(`${giftName}-${animationType || "gift"}-${amount}-${comboCount}`),
    [animationType, amount, comboCount, giftName],
  )

  useEffect(() => {
    setMode(resolvePerformanceMode())
  }, [])

  useEffect(() => {
    if (!isVisible || !mode.enabled || !canvasRef.current) return undefined

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return undefined

    let particles: Particle[] = []
    let startedAt = performance.now()

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, mode.lowEnd ? 1.25 : 2)
      canvas.width = Math.floor(window.innerWidth * ratio)
      canvas.height = Math.floor(window.innerHeight * ratio)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      particles = makeParticles({
        family,
        count: particleCount,
        width: window.innerWidth,
        height: window.innerHeight,
        seed,
      })
    }

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / DURATION_MS)
      drawScene({
        ctx: context,
        width: window.innerWidth,
        height: window.innerHeight,
        progress,
        particles,
        family,
        accentA,
        accentB,
        accentC,
      })

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(tick)
      }
    }

    resize()
    startedAt = performance.now()
    animationRef.current = window.requestAnimationFrame(tick)
    window.addEventListener("resize", resize)

    dispatchSoundCue(animationType, "intro", 0)
    cueTimersRef.current = [
      window.setTimeout(() => dispatchSoundCue(animationType, family === "whale" ? "splash" : "impact", 1400), 1400),
      window.setTimeout(() => dispatchSoundCue(animationType, family === "lion" ? "roar" : "finale", 3100), 3100),
    ]

    return () => {
      window.removeEventListener("resize", resize)
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
      }
      cueTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      cueTimersRef.current = []
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [accentA, accentB, accentC, animationType, family, isVisible, mode.enabled, mode.lowEnd, particleCount, seed])

  if (!isVisible || !mode.enabled) {
    return null
  }

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[65] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: family === "lion" || family === "fire" ? [0, -7, 6, -3, 0] : 0,
      }}
      exit={{ opacity: 0 }}
      transition={{
        opacity: { duration: DURATION_MS / 1000, times: [0, 0.08, 0.86, 1], ease: "easeOut" },
        x: { duration: 0.68, delay: 2.05, ease: "easeInOut" },
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-x-0 top-0 h-24 opacity-80 blur-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${accentA}55, ${accentB}44, transparent)` }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32 opacity-70 blur-2xl"
        style={{ background: `linear-gradient(90deg, transparent, ${accentC}44, ${accentA}44, transparent)` }}
      />
    </motion.div>
  )
}

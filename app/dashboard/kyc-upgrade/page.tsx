"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, LoaderCircle, ShieldAlert, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authRequest } from "@/lib/auth-client"
import { useAuth } from "@/app/context/AuthContext"

type DetectionBox = {
  x: number
  y: number
  width: number
  height: number
}

type LivenessAction = "turn_left" | "turn_right" | "look_up" | "look_down" | "blink" | "open_mouth"

type ActionBaseline = {
  normalizedX: number
  normalizedY: number
  yaw: number
  pitch: number
  blink: number
  mouthOpen: number
  eyeLookUp: number
  eyeLookDown: number
}

const ACTION_LABEL: Record<LivenessAction, string> = {
  turn_left: "Turn left",
  turn_right: "Turn right",
  look_up: "Look up",
  look_down: "Look down",
  blink: "Blink",
  open_mouth: "Open your mouth",
}

const ACTION_VOICE_PROMPT: Record<LivenessAction, string> = {
  turn_left: "Please turn left.",
  turn_right: "Please turn right.",
  look_up: "Please look up.",
  look_down: "Please look down.",
  blink: "Please blink.",
  open_mouth: "Please open your mouth.",
}

function averageScores(scores: Record<string, number>, keys: string[]) {
  const values = keys.map((key) => Number(scores[key] || 0))
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

type UpgradeOptions = {
  currentTier: number
  currentTierRequirements: string[]
  currentLimits: Record<string, number>
  nextTier: number | null
  nextTierRequirements: string[]
  nextLimits: Record<string, number> | null
  requirementsMet: {
    bvnVerified: boolean
    ninVerified: boolean
    selfieVerified: boolean
    hasTransactionHistory: boolean
    proofOfAddressSubmitted: boolean
    creatorBusinessVerificationProvided: boolean
    enhancedDueDiligenceAccepted: boolean
  }
}

function formatNaira(value: number) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Could not read file."))
    reader.readAsDataURL(file)
  })
}

function validateImageFile(file: File) {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"]
  if (!allowedTypes.includes(String(file.type || "").toLowerCase())) {
    throw new Error("Use a PNG, JPG, or WEBP image.")
  }
  if (Number(file.size || 0) > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller.")
  }
}

export default function KycUpgradePage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [options, setOptions] = useState<UpgradeOptions | null>(null)
  const [governmentIdDataUrl, setGovernmentIdDataUrl] = useState("")
  const [selfieDataUrl, setSelfieDataUrl] = useState("")
  const [supportNote, setSupportNote] = useState("")
  const [transactionHistoryConfirmed, setTransactionHistoryConfirmed] = useState(false)
  const [addressVerificationProvided, setAddressVerificationProvided] = useState(false)
  const [creatorBusinessVerificationProvided, setCreatorBusinessVerificationProvided] = useState(false)
  const [enhancedDueDiligenceAccepted, setEnhancedDueDiligenceAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [cameraOn, setCameraOn] = useState(false)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceCentered, setFaceCentered] = useState(false)
  const [autoCaptureActive, setAutoCaptureActive] = useState(false)
  const [livenessPlan, setLivenessPlan] = useState<LivenessAction[]>([])
  const [activeActionIndex, setActiveActionIndex] = useState(0)
  const [completedActions, setCompletedActions] = useState<LivenessAction[]>([])
  const [selfieEvidenceDataUrls, setSelfieEvidenceDataUrls] = useState<string[]>([])
  const [detectorEngine, setDetectorEngine] = useState<"none" | "native" | "mediapipe">("none")
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorTimerRef = useRef<number | null>(null)
  const centeredFramesRef = useRef(0)
  const actionHoldFramesRef = useRef(0)
  const actionCooldownRef = useRef(0)
  const activeActionIndexRef = useRef(0)
  const livenessPlanRef = useRef<LivenessAction[]>([])
  const actionBaselineRef = useRef<ActionBaseline | null>(null)
  const actionBaselineIndexRef = useRef(-1)
  const actionReadyAtRef = useRef(0)
  const finalSelfieReadyAtRef = useRef(0)
  const nativeFaceDetectorRef = useRef<{ detect: (input: HTMLVideoElement) => Promise<any[]> } | null>(null)
  const mediapipeFaceDetectorRef = useRef<any>(null)
  const detectorEngineRef = useRef<"none" | "native" | "mediapipe">("none")

  const nextTier = options?.nextTier || null
  const isTier2Upgrade = nextTier === 2
  const isTier3Or4Upgrade = nextTier === 3 || nextTier === 4
  const livenessDone = livenessPlan.length > 0 && completedActions.length >= livenessPlan.length && Boolean(selfieDataUrl)

  const stopDetector = () => {
    if (detectorTimerRef.current) {
      window.clearInterval(detectorTimerRef.current)
      detectorTimerRef.current = null
    }
    centeredFramesRef.current = 0
    actionHoldFramesRef.current = 0
    actionCooldownRef.current = 0
    activeActionIndexRef.current = 0
    actionBaselineRef.current = null
    actionBaselineIndexRef.current = -1
    actionReadyAtRef.current = 0
    finalSelfieReadyAtRef.current = 0
    setAutoCaptureActive(false)
    setFaceDetected(false)
    setFaceCentered(false)
  }

  const extractBoundingBoxFromDetection = (detection: any): DetectionBox | null => {
    if (!detection) return null

    if (detection.boundingBox && typeof detection.boundingBox.x === "number") {
      return {
        x: detection.boundingBox.x,
        y: detection.boundingBox.y,
        width: detection.boundingBox.width,
        height: detection.boundingBox.height,
      }
    }

    if (detection.boundingBox && typeof detection.boundingBox.originX === "number") {
      return {
        x: detection.boundingBox.originX,
        y: detection.boundingBox.originY,
        width: detection.boundingBox.width,
        height: detection.boundingBox.height,
      }
    }

    return null
  }

  const ensureDetector = async () => {
    if (nativeFaceDetectorRef.current || mediapipeFaceDetectorRef.current) {
      return detectorEngineRef.current
    }

    try {
      const visionModule = await import("@mediapipe/tasks-vision")
      const vision = await visionModule.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      )
      mediapipeFaceDetectorRef.current = await visionModule.FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          delegate: "GPU",
        },
        numFaces: 1,
        runningMode: "VIDEO",
        minFaceDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
      })
      detectorEngineRef.current = "mediapipe"
      setDetectorEngine("mediapipe")
      return "mediapipe"
    } catch {
      mediapipeFaceDetectorRef.current = null
    }

    const FaceDetectorApi = (window as { FaceDetector?: unknown }).FaceDetector as
      | (new (...args: unknown[]) => { detect: (input: HTMLVideoElement) => Promise<any[]> })
      | undefined

    if (FaceDetectorApi) {
      try {
        nativeFaceDetectorRef.current = new FaceDetectorApi({
          fastMode: true,
          maxDetectedFaces: 1,
        } as unknown as never)
        detectorEngineRef.current = "native"
        setDetectorEngine("native")
        return "native"
      } catch {
        nativeFaceDetectorRef.current = null
      }
    }

    detectorEngineRef.current = "none"
    setDetectorEngine("none")
    return "none"
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const response = await authRequest("/kyc/upgrade-options")
        const payload = await response.json()
        if (!response.ok) throw new Error(payload?.error || "Could not load tier upgrade options.")
        setOptions(payload)
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not load tier upgrade options.")
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => {
      stopDetector()
      if (mediapipeFaceDetectorRef.current?.close) {
        mediapipeFaceDetectorRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch {
      setError("Camera access was denied. Allow camera permission and try again.")
    }
  }

  const closeCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraOn(false)
  }

  const captureFrameDataUrl = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return ""
    const width = video.videoWidth || 720
    const height = video.videoHeight || 540
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) return ""
    context.drawImage(video, 0, 0, width, height)
    return canvas.toDataURL("image/jpeg", 0.92)
  }

  const speakPrompt = (text: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof window.SpeechSynthesisUtterance !== "function"
    ) {
      return
    }
    try {
      const utterance = new window.SpeechSynthesisUtterance(text)
      utterance.rate = 0.92
      utterance.pitch = 1
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } catch {
      // no-op on unsupported speech engines
    }
  }

  const startAutoCapture = async () => {
    if (!cameraOn) {
      await startCamera()
    }
    if (!videoRef.current) {
      setAutoCaptureActive(false)
      setError("Camera is not ready yet. Please start camera and try again.")
      return
    }

    stopDetector()
    setAutoCaptureActive(true)
    setShowCompletionOverlay(false)
    setSelfieEvidenceDataUrls([])
    setCompletedActions([])
    setSelfieDataUrl("")
    actionHoldFramesRef.current = 0
    actionCooldownRef.current = 0

    const activeEngine = await ensureDetector()
    if (activeEngine === "none") {
      setAutoCaptureActive(false)
      setMessage("Auto-capture is unavailable in this browser right now. Use manual capture.")
      return
    }
    const baseActions: LivenessAction[] =
      activeEngine === "mediapipe"
        ? ["turn_left", "turn_right", "look_up", "look_down", "blink", "open_mouth"]
        : ["turn_left", "turn_right", "look_up", "look_down"]
    const desiredCount = Math.min(Math.random() > 0.5 ? 3 : 2, baseActions.length)
    const shuffled = [...baseActions].sort(() => Math.random() - 0.5)
    const selectedPlan = shuffled.slice(0, desiredCount)
    livenessPlanRef.current = selectedPlan
    activeActionIndexRef.current = 0
    setLivenessPlan(selectedPlan)
    setActiveActionIndex(0)
    setMessage("Liveness check started. Follow the voice prompts.")
    actionReadyAtRef.current = Date.now() + 900
    window.setTimeout(() => {
      speakPrompt(`Please make sure your face is in the circle. ${ACTION_VOICE_PROMPT[selectedPlan[0]]}`)
    }, 250)

    detectorTimerRef.current = window.setInterval(async () => {
      try {
        const video = videoRef.current
        if (!video || video.readyState < 2) {
          setFaceDetected(false)
          setFaceCentered(false)
          centeredFramesRef.current = 0
          return
        }

        let box: DetectionBox | null = null
        let blendshapeScores: Record<string, number> = {}
        let landmarks: Array<{ x: number; y: number; z?: number }> = []
        if (detectorEngineRef.current === "native" && nativeFaceDetectorRef.current) {
          const faces = await nativeFaceDetectorRef.current.detect(video)
          box = extractBoundingBoxFromDetection(faces?.[0])
        } else if (detectorEngineRef.current === "mediapipe" && mediapipeFaceDetectorRef.current) {
          const result = mediapipeFaceDetectorRef.current.detectForVideo(video, performance.now())
          landmarks = Array.isArray(result?.faceLandmarks?.[0]) ? result.faceLandmarks[0] : []
          if (landmarks.length) {
            const xs = landmarks.map((point: any) => Number(point?.x || 0))
            const ys = landmarks.map((point: any) => Number(point?.y || 0))
            const minX = Math.max(0, Math.min(...xs))
            const minY = Math.max(0, Math.min(...ys))
            const maxX = Math.min(1, Math.max(...xs))
            const maxY = Math.min(1, Math.max(...ys))
            box = {
              x: minX * video.videoWidth,
              y: minY * video.videoHeight,
              width: Math.max(1, (maxX - minX) * video.videoWidth),
              height: Math.max(1, (maxY - minY) * video.videoHeight),
            }
          }
          const categories = Array.isArray(result?.faceBlendshapes?.[0]?.categories)
            ? result.faceBlendshapes[0].categories
            : []
          blendshapeScores = categories.reduce((acc: Record<string, number>, item: any) => {
            const key = String(item?.categoryName || "").trim()
            if (key) acc[key] = Number(item?.score || 0)
            return acc
          }, {})
        }

        if (!box) {
          setFaceDetected(false)
          setFaceCentered(false)
          centeredFramesRef.current = 0
          return
        }

        const vw = video.videoWidth || 1
        const vh = video.videoHeight || 1
        const cx = box.x + box.width / 2
        const cy = box.y + box.height / 2
        const centerX = vw / 2
        const centerY = vh / 2
        const faceSizeRatio = (box.width * box.height) / (vw * vh)
        const centered =
          Math.abs(cx - centerX) < vw * 0.12 &&
          Math.abs(cy - centerY) < vh * 0.14 &&
          faceSizeRatio > 0.07 &&
          faceSizeRatio < 0.45
        const normalizedX = cx / vw
        const normalizedY = cy / vh

        setFaceDetected(true)
        setFaceCentered(centered)

        if (actionCooldownRef.current > 0) {
          actionCooldownRef.current -= 1
          return
        }

        const currentPlan = livenessPlanRef.current
        const currentIndex = activeActionIndexRef.current
        if (currentIndex >= currentPlan.length) {
          if (Date.now() < finalSelfieReadyAtRef.current) {
            return
          }

          if (centered) {
            centeredFramesRef.current += 1
          } else {
            centeredFramesRef.current += 0.5
          }
          if (centeredFramesRef.current >= 2) {
            const finalSelfie = captureFrameDataUrl()
            if (!finalSelfie) return
            setSelfieDataUrl(finalSelfie)
            setMessage("Liveness checks passed. Final selfie captured.")
            setShowCompletionOverlay(true)
            const doneVoice =
              nextTier === 3
                ? "Liveness check completed, please tick the confirm successful transaction history and click upgrade to tier 3."
                : `Liveness check completed, please complete the required confirmation and click upgrade to tier ${nextTier || "next tier"}.`
            speakPrompt(doneVoice)
            window.setTimeout(() => {
              closeCameraStream()
              stopDetector()
            }, 650)
            window.setTimeout(() => {
              setShowCompletionOverlay(false)
            }, 2500)
          }
          return
        }

        const currentAction = currentPlan[currentIndex]
        if (!currentAction) return

        const blinkScore = ((blendshapeScores.eyeBlinkLeft || 0) + (blendshapeScores.eyeBlinkRight || 0)) / 2
        const mouthOpenScore = blendshapeScores.jawOpen || blendshapeScores.mouthOpen || 0
        const eyeLookUpScore = averageScores(blendshapeScores, ["eyeLookUpLeft", "eyeLookUpRight"])
        const eyeLookDownScore = averageScores(blendshapeScores, ["eyeLookDownLeft", "eyeLookDownRight"])

        const leftEye = landmarks[33]
        const rightEye = landmarks[263]
        const noseTip = landmarks[1]
        let yaw = (normalizedX - 0.5) * 2
        let pitch = (normalizedY - 0.5) * 2
        if (leftEye && rightEye && noseTip) {
          const eyeMidX = (Number(leftEye.x || 0) + Number(rightEye.x || 0)) / 2
          const eyeMidY = (Number(leftEye.y || 0) + Number(rightEye.y || 0)) / 2
          const eyeDistance = Math.max(
            0.0001,
            Math.hypot(Number(rightEye.x || 0) - Number(leftEye.x || 0), Number(rightEye.y || 0) - Number(leftEye.y || 0)),
          )
          yaw = (Number(noseTip.x || 0) - eyeMidX) / eyeDistance
          pitch = (Number(noseTip.y || 0) - eyeMidY) / eyeDistance
        }

        if (actionBaselineIndexRef.current !== currentIndex) {
          actionBaselineRef.current = null
          actionBaselineIndexRef.current = currentIndex
        }

        if (!actionBaselineRef.current) {
          if (!centered) {
            setMessage(`Center your face, then ${ACTION_LABEL[currentAction].toLowerCase()}.`)
            actionHoldFramesRef.current = 0
            return
          }
          actionBaselineRef.current = {
            normalizedX,
            normalizedY,
            yaw,
            pitch,
            blink: blinkScore,
            mouthOpen: mouthOpenScore,
            eyeLookUp: eyeLookUpScore,
            eyeLookDown: eyeLookDownScore,
          }
          actionHoldFramesRef.current = 0
          return
        }

        const baseline = actionBaselineRef.current
        if (Date.now() < actionReadyAtRef.current) {
          return
        }

        let actionPassed = false
        if (currentAction === "turn_left") {
          const yawDelta = yaw - baseline.yaw
          actionPassed = yawDelta > 0.12
        } else if (currentAction === "turn_right") {
          const yawDelta = yaw - baseline.yaw
          actionPassed = yawDelta < -0.12
        } else if (currentAction === "look_up") {
          const pitchDelta = baseline.pitch - pitch
          const eyeLookDelta = eyeLookUpScore - baseline.eyeLookUp
          actionPassed = pitchDelta > 0.055 || eyeLookDelta > 0.11 || eyeLookUpScore > 0.32
        } else if (currentAction === "look_down") {
          const pitchDelta = pitch - baseline.pitch
          const eyeLookDelta = eyeLookDownScore - baseline.eyeLookDown
          actionPassed = pitchDelta > 0.055 || eyeLookDelta > 0.11 || eyeLookDownScore > 0.32
        } else if (currentAction === "blink") {
          const blinkDelta = blinkScore - baseline.blink
          actionPassed = blinkDelta > 0.12 && blinkScore > 0.2
        } else if (currentAction === "open_mouth") {
          const mouthDelta = mouthOpenScore - baseline.mouthOpen
          actionPassed = mouthDelta > 0.1 && mouthOpenScore > 0.18
        }

        if (actionPassed) {
          actionHoldFramesRef.current += 1
        } else {
          actionHoldFramesRef.current = 0
        }

        if (actionHoldFramesRef.current >= 2) {
          const evidence = captureFrameDataUrl()
          if (evidence) {
            setSelfieEvidenceDataUrls((current) => [...current, evidence].slice(0, 4))
          }
          setCompletedActions((current) => (current.includes(currentAction) ? current : [...current, currentAction]))
          actionHoldFramesRef.current = 0
          actionCooldownRef.current = 5

          const nextIndex = currentIndex + 1
          activeActionIndexRef.current = nextIndex
          setActiveActionIndex(nextIndex)
          actionBaselineRef.current = null
          actionBaselineIndexRef.current = -1
          if (nextIndex < currentPlan.length) {
            setMessage(`Good. Next: ${ACTION_LABEL[currentPlan[nextIndex]]}.`)
            actionReadyAtRef.current = Date.now() + 650
            speakPrompt(`Good. ${ACTION_VOICE_PROMPT[currentPlan[nextIndex]]}`)
            return
          }

          setMessage("Action checks complete. Hold your face steady in the oval.")
          centeredFramesRef.current = 0
          finalSelfieReadyAtRef.current = Date.now() + 600
          speakPrompt("Good. All actions completed. Hold still for final selfie.")
        }
      } catch {
        setFaceDetected(false)
        setFaceCentered(false)
        centeredFramesRef.current = 0
        actionHoldFramesRef.current = 0
      }
    }, 350)
  }

  const canSubmit = useMemo(() => {
    if (!options || !nextTier) return false
    if (nextTier === 2) {
      return options.requirementsMet.bvnVerified && options.requirementsMet.ninVerified
    }

    if (!governmentIdDataUrl || !selfieDataUrl || selfieEvidenceDataUrls.length < 2) return false

    if (nextTier === 3) {
      return transactionHistoryConfirmed
    }

    return (
      transactionHistoryConfirmed &&
      addressVerificationProvided &&
      creatorBusinessVerificationProvided &&
      enhancedDueDiligenceAccepted
    )
  }, [
    options,
    nextTier,
    governmentIdDataUrl,
    selfieDataUrl,
    selfieEvidenceDataUrls.length,
    transactionHistoryConfirmed,
    addressVerificationProvided,
    creatorBusinessVerificationProvided,
    enhancedDueDiligenceAccepted,
  ])

  const submitUpgrade = async () => {
    if (!options || !nextTier) return
    setSubmitting(true)
    setError("")
    setMessage("")

    try {
      const response = await authRequest("/kyc/upgrade-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetTier: nextTier,
          governmentIdDataUrl,
          selfieDataUrl,
          selfieEvidenceDataUrls,
          supportNote,
          transactionHistoryConfirmed,
          addressVerificationProvided,
          creatorBusinessVerificationProvided,
          enhancedDueDiligenceAccepted,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Could not submit tier upgrade request.")
      }
      await refreshUser()
      setMessage(payload?.message || "Tier upgrade submission completed.")
      window.setTimeout(() => router.push("/dashboard/settings"), 1200)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not submit tier upgrade request.")
    } finally {
      setSubmitting(false)
    }
  }

  const ovalToneClass = useMemo(() => {
    if (!cameraOn) return "border-cyan-300/80"
    if (faceCentered) return "border-emerald-400"
    return "border-red-400"
  }, [cameraOn, faceCentered])

  if (loading) {
    return (
      <div data-tour="upgrade-tier-main" className="p-6 text-zinc-300">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!options) {
    return <div data-tour="upgrade-tier-main" className="p-6 text-red-300">{error || "Could not load KYC options."}</div>
  }

  if (!nextTier) {
    return (
      <div data-tour="upgrade-tier-main" className="p-6 max-w-3xl">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
          You are already on Tier 4, the highest tier.
        </div>
      </div>
    )
  }

  return (
    <div data-tour="upgrade-tier-main" className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upgrade Tier</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Tier {options.currentTier} to Tier {nextTier}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
        <p className="text-sm font-semibold text-white">Next Tier Requirements</p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-300">
          {options.nextTierRequirements.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
        {options.nextLimits ? (
          <div className="mt-4 grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
            <div>Single gift: {formatNaira(options.nextLimits.singleGift)}</div>
            <div>Daily gifting: {formatNaira(options.nextLimits.dailyGift)}</div>
            <div>Monthly gifting: {formatNaira(options.nextLimits.monthlyGift)}</div>
            <div>Single withdrawal: {formatNaira(options.nextLimits.singleWithdrawal)}</div>
            <div>Daily withdrawal: {formatNaira(options.nextLimits.dailyWithdrawal)}</div>
            <div>Monthly withdrawal: {formatNaira(options.nextLimits.monthlyWithdrawal)}</div>
          </div>
        ) : null}
      </div>

      {isTier2Upgrade ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-3">
          <p className="text-sm text-zinc-300">Tier 2 requires verified BVN and NIN.</p>
          <p className="text-sm text-zinc-400">
            BVN verified: {options.requirementsMet.bvnVerified ? "Yes" : "No"} | NIN verified:{" "}
            {options.requirementsMet.ninVerified ? "Yes" : "No"}
          </p>
        </div>
      ) : null}

      {isTier3Or4Upgrade ? (
        <div className="space-y-5">
          {currentStep === 1 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-3">
              <p className="text-sm font-semibold text-white">Step 1: Government ID upload</p>
              <p className="text-xs text-zinc-400">
                Accepted IDs: Passport, Driver&apos;s License, Voter&apos;s Card, National Identity Card.
              </p>
              <p className="text-xs text-zinc-500">File must be PNG, JPG, or WEBP and not more than 5 MB.</p>
              <label className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 cursor-pointer">
                <Upload className="h-4 w-4" />
                Upload ID image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    try {
                      validateImageFile(file)
                      const dataUrl = await readFileAsDataUrl(file)
                      setGovernmentIdDataUrl(dataUrl)
                      setMessage("Government ID uploaded.")
                      setError("")
                    } catch (requestError) {
                      setError(requestError instanceof Error ? requestError.message : "Could not read that ID image.")
                    }
                  }}
                />
              </label>
              {governmentIdDataUrl ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">ID thumbnail preview</p>
                  <img
                    src={governmentIdDataUrl}
                    alt="Government ID preview"
                    className="h-24 w-36 rounded-md border border-zinc-700 object-cover"
                  />
                </div>
              ) : null}
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    if (!governmentIdDataUrl) {
                      setError("Upload your government-issued ID to continue.")
                      return
                    }
                    setCurrentStep(2)
                    setError("")
                  }}
                >
                  Submit ID and Continue
                </Button>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-3">
                <p className="text-sm font-semibold text-white">Step 2: Selfie verification</p>
                <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-700 bg-black">
                  <video ref={videoRef} className="h-72 w-full object-cover" playsInline muted />
                  {showCompletionOverlay ? (
                    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-emerald-500/80 text-white">
                      <CheckCircle2 className="h-12 w-12" />
                      <p className="mt-2 text-sm font-semibold">Liveness Completed</p>
                    </div>
                  ) : null}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className={`h-52 w-40 rounded-[999px] border-2 transition-colors ${ovalToneClass}`} />
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  {autoCaptureActive
                    ? !faceDetected
                      ? "No face detected. Look straight into the camera."
                      : activeActionIndex < livenessPlan.length
                        ? ACTION_VOICE_PROMPT[livenessPlan[activeActionIndex]]
                        : faceCentered
                          ? "All actions done. Hold still for final capture."
                          : "All actions done. Keep your face centered in the oval."
                    : "Start auto-capture or capture manually."}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Detection: {detectorEngine === "none" ? "initializing..." : detectorEngine}
                </p>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void startAutoCapture()} variant="outline" className="border-zinc-700">
                    Auto-capture
                  </Button>
                </div>
                {selfieDataUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400">Selfie thumbnail preview</p>
                    <img
                      src={selfieDataUrl}
                      alt="Selfie preview"
                      className="h-24 w-24 rounded-full border border-zinc-700 object-cover"
                    />
                  </div>
                ) : null}
                {livenessPlan.length ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400">Liveness actions</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {livenessPlan.map((action) => {
                        const isDone = completedActions.includes(action)
                        const isActive = !isDone && action === livenessPlan[activeActionIndex]
                        return (
                          <div
                            key={action}
                            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                              isDone
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                : isActive
                                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <div className="h-4 w-4 rounded-full border border-zinc-600" />}
                            {ACTION_LABEL[action]}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
                {livenessDone ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Liveness verification done. You can submit now.
                  </div>
                ) : null}
                {selfieEvidenceDataUrls.length ? (
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-400">Auto-captured liveness frames</p>
                    <div className="flex flex-wrap gap-2">
                      {selfieEvidenceDataUrls.map((frame, index) => (
                        <div
                          key={`evidence-${index}`}
                          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-1"
                        >
                          <img
                            src={frame}
                            alt={`Liveness frame ${index + 1}`}
                            className="h-14 w-14 rounded object-cover"
                          />
                          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            Captured
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-3">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={transactionHistoryConfirmed}
                    onChange={(event) => setTransactionHistoryConfirmed(event.target.checked)}
                  />
                  I confirm successful transaction history.
                </label>

                {nextTier === 4 ? (
                  <>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={addressVerificationProvided}
                        onChange={(event) => setAddressVerificationProvided(event.target.checked)}
                      />
                      Address verification provided.
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={creatorBusinessVerificationProvided}
                        onChange={(event) => setCreatorBusinessVerificationProvided(event.target.checked)}
                      />
                      Creator/business verification provided.
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={enhancedDueDiligenceAccepted}
                        onChange={(event) => setEnhancedDueDiligenceAccepted(event.target.checked)}
                      />
                      Enhanced due diligence completed.
                    </label>
                  </>
                ) : null}

                <textarea
                  value={supportNote}
                  onChange={(event) => setSupportNote(event.target.value)}
                  placeholder="Optional note for portal reviewers"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm text-white"
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {message ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">{message}</div> : null}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="border-zinc-700" onClick={() => router.push("/dashboard/settings")}>
          Back
        </Button>
        {isTier3Or4Upgrade && currentStep === 2 ? (
          <Button type="button" variant="outline" className="border-zinc-700" onClick={() => setCurrentStep(1)}>
            Back to ID Step
          </Button>
        ) : null}
        <Button type="button" onClick={() => void submitUpgrade()} disabled={!canSubmit || submitting}>
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : `Upgrade to Tier ${nextTier}`}
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, CheckCircle2, LoaderCircle, ShieldAlert, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authRequest } from "@/lib/auth-client"
import { useAuth } from "@/app/context/AuthContext"

type DetectionBox = {
  x: number
  y: number
  width: number
  height: number
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
  const [livenessStage, setLivenessStage] = useState<"move_left" | "move_right" | "passed">("move_left")
  const [detectorEngine, setDetectorEngine] = useState<"none" | "native" | "mediapipe">("none")

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorTimerRef = useRef<number | null>(null)
  const centeredFramesRef = useRef(0)
  const nativeFaceDetectorRef = useRef<{ detect: (input: HTMLVideoElement) => Promise<any[]> } | null>(null)
  const mediapipeFaceDetectorRef = useRef<any>(null)
  const detectorEngineRef = useRef<"none" | "native" | "mediapipe">("none")

  const nextTier = options?.nextTier || null
  const isTier2Upgrade = nextTier === 2
  const isTier3Or4Upgrade = nextTier === 3 || nextTier === 4

  const stopDetector = () => {
    if (detectorTimerRef.current) {
      window.clearInterval(detectorTimerRef.current)
      detectorTimerRef.current = null
    }
    centeredFramesRef.current = 0
    setAutoCaptureActive(false)
    setFaceDetected(false)
    setFaceCentered(false)
    setLivenessStage("move_left")
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

    try {
      const visionModule = await import("@mediapipe/tasks-vision")
      const vision = await visionModule.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
      )
      mediapipeFaceDetectorRef.current = await visionModule.FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      })
      detectorEngineRef.current = "mediapipe"
      setDetectorEngine("mediapipe")
      return "mediapipe"
    } catch {
      detectorEngineRef.current = "none"
      setDetectorEngine("none")
      return "none"
    }
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

  const stopCamera = () => {
    stopDetector()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraOn(false)
  }

  const captureFromVideo = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const width = video.videoWidth || 720
    const height = video.videoHeight || 540
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) return
    context.drawImage(video, 0, 0, width, height)
    setSelfieDataUrl(canvas.toDataURL("image/jpeg", 0.92))
    setMessage("Selfie captured successfully.")
    stopDetector()
  }

  const startAutoCapture = async () => {
    if (!cameraOn) {
      await startCamera()
    }

    stopDetector()
    setAutoCaptureActive(true)
    setLivenessStage("move_left")
    const activeEngine = await ensureDetector()
    if (activeEngine === "none") {
      setAutoCaptureActive(false)
      setMessage("Auto-capture is unavailable in this browser right now. Use manual capture.")
      return
    }

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
        if (detectorEngineRef.current === "native" && nativeFaceDetectorRef.current) {
          const faces = await nativeFaceDetectorRef.current.detect(video)
          box = extractBoundingBoxFromDetection(faces?.[0])
        } else if (detectorEngineRef.current === "mediapipe" && mediapipeFaceDetectorRef.current) {
          const result = mediapipeFaceDetectorRef.current.detectForVideo(video, performance.now())
          const detections = Array.isArray(result?.detections) ? result.detections : []
          box = extractBoundingBoxFromDetection(detections[0])
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

        setFaceDetected(true)
        setFaceCentered(centered)

        if (livenessStage === "move_left" && normalizedX < 0.44) {
          setLivenessStage("move_right")
          centeredFramesRef.current = 0
          return
        }

        if (livenessStage === "move_right" && normalizedX > 0.56) {
          setLivenessStage("passed")
          centeredFramesRef.current = 0
          return
        }

        if (livenessStage !== "passed") {
          centeredFramesRef.current = 0
          return
        }

        if (!centered) {
          centeredFramesRef.current = 0
          return
        }

        centeredFramesRef.current += 1
        if (centeredFramesRef.current >= 3) {
          captureFromVideo()
        }
      } catch {
        setFaceDetected(false)
        setFaceCentered(false)
        centeredFramesRef.current = 0
      }
    }, 350)
  }

  const canSubmit = useMemo(() => {
    if (!options || !nextTier) return false
    if (nextTier === 2) {
      return options.requirementsMet.bvnVerified && options.requirementsMet.ninVerified
    }

    if (!governmentIdDataUrl || !selfieDataUrl) return false

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
      <div className="p-6 text-zinc-300">
        <LoaderCircle className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!options) {
    return <div className="p-6 text-red-300">{error || "Could not load KYC options."}</div>
  }

  if (!nextTier) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
          You are already on Tier 4, the highest tier.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
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
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className={`h-52 w-40 rounded-[999px] border-2 transition-colors ${ovalToneClass}`} />
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  {autoCaptureActive
                    ? !faceDetected
                      ? "No face detected. Look straight into the camera."
                      : livenessStage === "move_left"
                        ? "Face detected. Move your face slightly to the LEFT."
                        : livenessStage === "move_right"
                          ? "Good. Now move your face slightly to the RIGHT."
                          : faceCentered
                            ? "Face centered and live check passed. Capturing..."
                            : "Live check passed. Move into the oval center."
                    : "Start auto-capture or capture manually."}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Detection: {detectorEngine === "none" ? "initializing..." : detectorEngine}
                </p>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => void startCamera()} variant="outline" className="border-zinc-700">
                    <Camera className="mr-2 h-4 w-4" />
                    Start camera
                  </Button>
                  <Button type="button" onClick={() => void startAutoCapture()} variant="outline" className="border-zinc-700">
                    Auto-capture
                  </Button>
                  <Button type="button" onClick={captureFromVideo} variant="outline" className="border-zinc-700">
                    Capture now
                  </Button>
                  <Button type="button" onClick={stopCamera} variant="outline" className="border-zinc-700">
                    Stop camera
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

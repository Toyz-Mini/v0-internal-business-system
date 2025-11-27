"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Camera, Loader2, MapPin, CheckCircle, XCircle, RefreshCw, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CameraAttendanceProps {
  employeeId: string
  attendanceId?: string
  type: "clock_in" | "clock_out"
  onSuccess?: () => void
  photoRequired?: boolean
}

export function CameraAttendance({
  employeeId,
  attendanceId,
  type,
  onSuccess,
  photoRequired = true,
}: CameraAttendanceProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCheckingPermission, setIsCheckingPermission] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  // Get geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
          setGeoError(null)
        },
        (error) => {
          console.error("[v0] Geo error:", error)
          setGeoError("Tidak dapat mendapatkan lokasi. Sila benarkan akses lokasi.")
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    } else {
      setGeoError("Pelayar tidak menyokong geolokasi")
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      setIsCheckingPermission(true)

      // Check camera permission first (for supported browsers)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName })
          console.log("[v0] Camera permission status:", permissionStatus.state)
        } catch (e) {
          // Permission API not supported, continue anyway
          console.log("[v0] Permission API not supported, proceeding...")
        }
      }

      let mediaStream: MediaStream | null = null

      try {
        // First attempt: exact front camera
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        console.log("[v0] Camera started with exact:user facingMode")
      } catch (exactError) {
        console.log("[v0] Exact facingMode failed, trying fallback:", exactError)
        // Fallback: just request user camera without exact
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        console.log("[v0] Camera started with user facingMode fallback")
      }

      if (!mediaStream) {
        throw new Error("Tidak dapat mendapatkan stream kamera")
      }

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        try {
          await videoRef.current.play()
          console.log("[v0] Video playing successfully")
        } catch (playError) {
          console.error("[v0] Video play error:", playError)
        }
      }

      setIsCapturing(true)
      setIsCheckingPermission(false)
    } catch (error) {
      console.error("[v0] Camera error:", error)
      setIsCheckingPermission(false)

      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setCameraError("Akses kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar anda.")
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setCameraError("Kamera tidak dijumpai. Pastikan peranti anda mempunyai kamera.")
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
          setCameraError("Kamera sedang digunakan oleh aplikasi lain. Sila tutup aplikasi lain dan cuba lagi.")
        } else {
          setCameraError(`Tidak dapat mengakses kamera: ${error.message}`)
        }
      } else {
        setCameraError("Tidak dapat mengakses kamera. Sila cuba lagi.")
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
        console.log("[v0] Camera track stopped")
      })
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
  }, [stream])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("[v0] Video or canvas ref not available")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      console.error("[v0] Cannot get canvas context")
      return
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast.error("Sila tunggu kamera siap sepenuhnya")
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    console.log("[v0] Capturing photo:", { width: canvas.width, height: canvas.height })

    ctx.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedImage(imageData)
    stopCamera()
  }, [stopCamera])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  const handleSubmit = async () => {
    if (photoRequired && !capturedImage) {
      toast.error("Sila ambil gambar terlebih dahulu")
      return
    }

    setIsSubmitting(true)
    try {
      let photoUrl: string | null = null
      let storagePath: string | null = null

      // Upload photo if captured
      if (capturedImage) {
        const base64Data = capturedImage.split(",")[1]
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then((r) => r.blob())
        const filename = `attendance/${employeeId}/${Date.now()}_${type}.jpg`

        const { error: uploadError } = await supabase.storage
          .from("employee-docs")
          .upload(filename, blob, { contentType: "image/jpeg" })

        if (uploadError) throw uploadError

        storagePath = filename
        const { data: urlData } = supabase.storage.from("employee-docs").getPublicUrl(filename)
        photoUrl = urlData.publicUrl
      }

      const now = new Date().toISOString()

      if (type === "clock_in") {
        const { error } = await supabase.from("attendance").insert({
          employee_id: employeeId,
          clock_in: now,
          photo_url: photoUrl,
          photo_storage_path: storagePath,
          geo_lat: geoLocation?.lat,
          geo_lon: geoLocation?.lon,
          is_late: false,
          break_duration: 1,
          normal_hours: 8,
          working_hours: 0,
          overtime_hours: 0,
        })

        if (error) throw error
        toast.success("Clock In berjaya!")
      } else {
        if (!attendanceId) throw new Error("Tiada rekod kehadiran untuk clock out")

        // Get the attendance record to calculate OT
        const { data: attendanceData, error: fetchError } = await supabase
          .from("attendance")
          .select("clock_in, break_duration, normal_hours")
          .eq("id", attendanceId)
          .single()

        if (fetchError) throw fetchError

        // Get OT settings
        const { data: settingsData } = await supabase
          .from("settings")
          .select("break_duration_hours, standard_work_hours_per_day")
          .single()

        const breakHours = settingsData?.break_duration_hours ?? attendanceData.break_duration ?? 1
        const normalHours = settingsData?.standard_work_hours_per_day ?? attendanceData.normal_hours ?? 8

        // Calculate OT using new duration-based logic
        const clockIn = new Date(attendanceData.clock_in)
        const clockOut = new Date(now)
        const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
        const workingHours = Math.max(0, totalHours - breakHours)
        const overtimeHours = Math.max(0, workingHours - normalHours)

        console.log("[v0] OT Calculation:", {
          totalHours: totalHours.toFixed(2),
          breakHours,
          workingHours: workingHours.toFixed(2),
          normalHours,
          overtimeHours: overtimeHours.toFixed(2),
        })

        const { error } = await supabase
          .from("attendance")
          .update({
            clock_out: now,
            total_hours: Number(totalHours.toFixed(2)),
            break_duration: breakHours,
            working_hours: Number(workingHours.toFixed(2)),
            normal_hours: normalHours,
            overtime_hours: Number(overtimeHours.toFixed(2)),
          })
          .eq("id", attendanceId)

        if (error) throw error
        toast.success("Clock Out berjaya!")
      }

      onSuccess?.()
    } catch (error) {
      console.error("[v0] Submit error:", error)
      toast.error(error instanceof Error ? error.message : "Gagal merekod kehadiran")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {type === "clock_in" ? "Clock In" : "Clock Out"}
        </CardTitle>
        <CardDescription>
          {photoRequired ? "Ambil gambar selfie untuk mengesahkan kehadiran" : "Rekod kehadiran anda"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Geolocation Status */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          {geoLocation ? (
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Lokasi direkod ({geoLocation.lat.toFixed(4)}, {geoLocation.lon.toFixed(4)})
            </span>
          ) : geoError ? (
            <span className="text-destructive flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              {geoError}
            </span>
          ) : (
            <span className="text-muted-foreground">Mendapatkan lokasi...</span>
          )}
        </div>

        {/* Camera Section */}
        {photoRequired && (
          <div className="space-y-4">
            {cameraError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{cameraError}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCameraError(null)
                      startCamera()
                    }}
                    className="ml-2"
                  >
                    Cuba Lagi
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!isCapturing && !capturedImage && (
              <Button onClick={startCamera} className="w-full" size="lg" disabled={isCheckingPermission}>
                {isCheckingPermission ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Menyemak Kebenaran...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Buka Kamera
                  </>
                )}
              </Button>
            )}

            {isCapturing && (
              <div className="space-y-4">
                <div className="relative w-full bg-black rounded-lg" style={{ aspectRatio: "4/3" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      background: "black",
                    }}
                    className="rounded-lg"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1" size="lg">
                    <Camera className="mr-2 h-5 w-5" />
                    Tangkap Gambar
                  </Button>
                  <Button onClick={stopCamera} variant="outline" size="lg">
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {capturedImage && (
              <div className="space-y-4">
                <div className="relative w-full bg-black rounded-lg" style={{ aspectRatio: "4/3" }}>
                  <img
                    src={capturedImage || "/placeholder.svg"}
                    alt="Captured"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2">
                    <Button size="sm" variant="secondary" onClick={retakePhoto}>
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Ambil Semula
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          className="w-full"
          size="lg"
          disabled={isSubmitting || (photoRequired && !capturedImage)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Merekod...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              {type === "clock_in" ? "Sahkan Clock In" : "Sahkan Clock Out"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

"use client"

import { useOnlineStatus } from "@/lib/ux-utils"
import { WifiOff, Wifi } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

export function OfflineBanner() {
  const { isOnline, lastOnlineTime } = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOnline && lastOnlineTime) {
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, lastOnlineTime])

  // Don't render on server or if online and not showing reconnected message
  if (!mounted || (isOnline && !showReconnected)) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-xs",
        "rounded-lg px-4 py-3 shadow-lg flex items-center gap-3 transition-all duration-300",
        isOnline ? "bg-green-600 text-white" : "bg-amber-500 text-white",
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Sambungan OK</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Tiada internet</span>
        </>
      )}
    </div>
  )
}

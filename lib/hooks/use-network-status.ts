"use client"

import { useState, useEffect, useCallback } from "react"

export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType?: string
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: undefined,
  })

  const checkConnection = useCallback(() => {
    const connection = (navigator as any).connection

    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection: connection
        ? connection.effectiveType === "slow-2g" || connection.effectiveType === "2g" || connection.downlink < 0.5
        : false,
      connectionType: connection?.effectiveType,
    })
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    window.addEventListener("online", checkConnection)
    window.addEventListener("offline", checkConnection)

    const connection = (navigator as any).connection
    if (connection) {
      connection.addEventListener("change", checkConnection)
    }

    // Initial check
    checkConnection()

    return () => {
      window.removeEventListener("online", checkConnection)
      window.removeEventListener("offline", checkConnection)
      if (connection) {
        connection.removeEventListener("change", checkConnection)
      }
    }
  }, [checkConnection])

  return status
}

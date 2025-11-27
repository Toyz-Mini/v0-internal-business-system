"use client"

// UX Utilities - Loading states, error handling, retry logic, offline detection

import { useState, useCallback, useEffect } from "react"

// Types
export interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  isRetrying: boolean
  retryCount: number
}

export interface RetryConfig {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
}

// Custom hook for async operations with retry logic
export function useAsyncAction<T>(config?: RetryConfig) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
    isRetrying: false,
    retryCount: 0,
  })

  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config }

  const execute = useCallback(
    async (action: () => Promise<T>): Promise<T | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null, retryCount: 0 }))

      let lastError: Error | null = null

      for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            setState((prev) => ({ ...prev, isRetrying: true, retryCount: attempt }))
            // Exponential backoff
            const delay = Math.min(mergedConfig.baseDelay * Math.pow(2, attempt - 1), mergedConfig.maxDelay)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }

          const result = await action()
          setState({ data: result, isLoading: false, error: null, isRetrying: false, retryCount: 0 })
          return result
        } catch (error: any) {
          lastError = error
          console.error(`Attempt ${attempt + 1} failed:`, error.message)

          // Don't retry on certain errors
          if (error.message?.includes("constraint") || error.message?.includes("permission")) {
            break
          }
        }
      }

      const errorMessage = getErrorMessage(lastError)
      setState({ data: null, isLoading: false, error: errorMessage, isRetrying: false, retryCount: 0 })
      return null
    },
    // [mergedConfig], // Removed mergedConfig from dependencies
  )

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isRetrying: false, retryCount: 0 })
  }, [])

  return { ...state, execute, reset }
}

// Error message parser for user-friendly messages
export function getErrorMessage(error: unknown): string {
  if (!error) return "An unknown error occurred"

  if (typeof error === "string") return error

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Network errors
    if (message.includes("fetch") || message.includes("network") || message.includes("timeout")) {
      return "Masalah sambungan rangkaian. Sila semak internet anda."
    }

    // Database errors
    if (message.includes("duplicate") || message.includes("unique")) {
      return "Data ini sudah wujud dalam sistem."
    }

    if (message.includes("foreign key") || message.includes("reference")) {
      return "Data ini berkaitan dengan rekod lain dan tidak boleh diubah."
    }

    if (message.includes("permission") || message.includes("rls")) {
      return "Anda tidak mempunyai kebenaran untuk tindakan ini."
    }

    if (message.includes("stock_conflict")) {
      return "Konflik stok berlaku. Sila cuba semula."
    }

    // Generic database error
    if (message.includes("database") || message.includes("supabase")) {
      return "Ralat pangkalan data. Sila cuba semula."
    }

    return error.message
  }

  return "An unexpected error occurred"
}

// Online/Offline detection hook
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastOnlineTime(new Date())
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return { isOnline, lastOnlineTime }
}

// Debounce hook for search inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Local storage cache hook with TTL
export function useLocalCache<T>(key: string, ttlMs: number = 5 * 60 * 1000) {
  const get = useCallback((): T | null => {
    if (typeof window === "undefined") return null

    try {
      const item = localStorage.getItem(key)
      if (!item) return null

      const { data, timestamp } = JSON.parse(item)
      if (Date.now() - timestamp > ttlMs) {
        localStorage.removeItem(key)
        return null
      }

      return data as T
    } catch {
      return null
    }
  }, [key, ttlMs])

  const set = useCallback(
    (data: T) => {
      if (typeof window === "undefined") return

      try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
      } catch (error) {
        console.error("Cache write error:", error)
      }
    },
    [key],
  )

  const clear = useCallback(() => {
    if (typeof window === "undefined") return
    localStorage.removeItem(key)
  }, [key])

  return { get, set, clear }
}

// Format currency for Malaysia and Brunei
// Format currency with dot decimal separator (BND/MYR/SGD)
export function formatCurrency(amount: number, currency: "MYR" | "BND" | "SGD" = "BND"): string {
  // Use en-GB locale for dot decimal separator instead of ms-MY/ms-BN which use comma
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Helper function for simple currency formatting without symbol lookup
export function formatCurrencySimple(amount: number, currencyCode = "BND"): string {
  return `${currencyCode} ${amount.toFixed(2)}`
}

// Format modifier price with +/- prefix
export function formatModifierPrice(amount: number, currencyCode = "BND"): string {
  const sign = amount >= 0 ? "+" : ""
  return `${sign}${currencyCode} ${Math.abs(amount).toFixed(2)}`
}

// Format date for Malaysia
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("ms-MY", options || { day: "2-digit", month: "short", year: "numeric" })
}

// Format time for Malaysia
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })
}

"use client"

import { useState, useCallback, useRef } from "react"

/**
 * Hook to prevent double-tap/double-click on form submissions
 * Returns a guarded submit handler and processing state
 */
export function useSubmitGuard<T extends (...args: any[]) => Promise<any>>(
  submitFn: T,
  options?: {
    minDelay?: number // Minimum delay between submissions (ms)
    onError?: (error: Error) => void
  },
) {
  const [isProcessing, setIsProcessing] = useState(false)
  const lastSubmitRef = useRef<number>(0)
  const minDelay = options?.minDelay ?? 1000 // Default 1 second

  const guardedSubmit = useCallback(
    async (...args: Parameters<T>) => {
      const now = Date.now()

      // Prevent double-tap
      if (isProcessing || now - lastSubmitRef.current < minDelay) {
        console.log("[v0] Submit blocked - already processing or too soon")
        return
      }

      lastSubmitRef.current = now
      setIsProcessing(true)

      try {
        const result = await submitFn(...args)
        return result
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    [submitFn, isProcessing, minDelay, options],
  )

  return {
    guardedSubmit,
    isProcessing,
    reset: () => {
      setIsProcessing(false)
      lastSubmitRef.current = 0
    },
  }
}

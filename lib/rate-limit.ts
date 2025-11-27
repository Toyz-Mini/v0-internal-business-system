interface RateLimitStore {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitStore>()

export interface RateLimitConfig {
  limit: number
  windowMs: number
}

export function rateLimit(identifier: string, config: RateLimitConfig): { success: boolean; remaining: number } {
  const now = Date.now()
  const existing = store.get(identifier)

  if (!existing || now > existing.resetTime) {
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return { success: true, remaining: config.limit - 1 }
  }

  if (existing.count >= config.limit) {
    return { success: false, remaining: 0 }
  }

  existing.count++
  return { success: true, remaining: config.limit - existing.count }
}

export function clearRateLimit(identifier: string): void {
  store.delete(identifier)
}

export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key)
    }
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 60000)
}

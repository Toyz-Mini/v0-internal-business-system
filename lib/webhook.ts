import crypto from "crypto"

interface WebhookConfig {
  url: string
  secret?: string
  events: string[]
  enabled: boolean
}

export async function triggerWebhooks(
  event: string,
  data: Record<string, unknown>,
  webhooks: WebhookConfig[],
): Promise<void> {
  const enabledWebhooks = webhooks.filter((w) => w.enabled && w.events.includes(event))

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  const body = JSON.stringify(payload)

  // Fire webhooks in parallel (non-blocking)
  await Promise.allSettled(
    enabledWebhooks.map(async (webhook) => {
      try {
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }

        if (webhook.secret) {
          const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex")
          headers["X-Webhook-Signature"] = signature
        }

        await fetch(webhook.url, {
          method: "POST",
          headers,
          body,
        })
      } catch (error) {
        console.error(`Webhook failed for ${webhook.url}:`, error)
      }
    }),
  )
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

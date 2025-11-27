import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
  try {
    const { url, secret } = await request.json()

    if (!url) {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 })
    }

    // Create test payload
    const payload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook from your POS system",
        test_id: crypto.randomUUID(),
      },
    }

    const body = JSON.stringify(payload)
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    // Add signature if secret provided
    if (secret) {
      const signature = crypto.createHmac("sha256", secret).update(body).digest("hex")
      headers["X-Webhook-Signature"] = signature
    }

    // Send test webhook
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Webhook returned ${response.status}: ${response.statusText}`,
        },
        { status: 200 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send test webhook",
      },
      { status: 200 },
    )
  }
}

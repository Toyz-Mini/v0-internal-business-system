"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { Webhook, Save, Plus, Trash2, TestTube, CheckCircle2, XCircle } from "lucide-react"

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  enabled: boolean
  secret?: string
  lastStatus?: "success" | "error" | null
}

interface Settings {
  id?: string
  webhooks?: WebhookConfig[]
}

const AVAILABLE_EVENTS = [
  { id: "order.created", label: "Order Created" },
  { id: "order.paid", label: "Order Paid" },
  { id: "order.voided", label: "Order Voided" },
  { id: "order.refunded", label: "Order Refunded" },
  { id: "inventory.low", label: "Low Inventory Alert" },
  { id: "customer.created", label: "New Customer" },
  { id: "attendance.clockin", label: "Staff Clock In" },
  { id: "attendance.clockout", label: "Staff Clock Out" },
]

export function WebhookSettings({ settings }: { settings: Settings | null }) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(settings?.webhooks || [])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  const addWebhook = () => {
    setWebhooks([
      ...webhooks,
      {
        id: crypto.randomUUID(),
        name: "New Webhook",
        url: "",
        events: [],
        enabled: true,
        secret: "",
      },
    ])
  }

  const updateWebhook = (id: string, updates: Partial<WebhookConfig>) => {
    setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, ...updates } : w)))
  }

  const removeWebhook = (id: string) => {
    setWebhooks(webhooks.filter((w) => w.id !== id))
  }

  const toggleEvent = (webhookId: string, eventId: string) => {
    const webhook = webhooks.find((w) => w.id === webhookId)
    if (!webhook) return

    const events = webhook.events.includes(eventId)
      ? webhook.events.filter((e) => e !== eventId)
      : [...webhook.events, eventId]

    updateWebhook(webhookId, { events })
  }

  const testWebhook = async (webhook: WebhookConfig) => {
    if (!webhook.url) {
      alert("Please enter a webhook URL")
      return
    }

    setTesting(webhook.id)

    try {
      const response = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhook.url,
          secret: webhook.secret,
        }),
      })

      const result = await response.json()
      updateWebhook(webhook.id, { lastStatus: result.success ? "success" : "error" })

      if (result.success) {
        alert("Test webhook sent successfully!")
      } else {
        alert(`Test failed: ${result.error}`)
      }
    } catch (error) {
      updateWebhook(webhook.id, { lastStatus: "error" })
      alert("Failed to send test webhook")
    } finally {
      setTesting(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      if (settings?.id) {
        await supabase.from("settings").update({ webhooks }).eq("id", settings.id)
      } else {
        await supabase.from("settings").insert({ webhooks })
      }
      alert("Webhook settings saved!")
    } catch (error) {
      alert("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Configure webhooks to integrate with external services. Webhooks will POST JSON data when events occur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No webhooks configured. Click "Add Webhook" to get started.
            </div>
          ) : (
            webhooks.map((webhook) => (
              <Card key={webhook.id} className="border-2">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={webhook.enabled}
                        onCheckedChange={(checked) => updateWebhook(webhook.id, { enabled: checked })}
                      />
                      <Input
                        value={webhook.name}
                        onChange={(e) => updateWebhook(webhook.id, { name: e.target.value })}
                        className="w-48 font-medium"
                        placeholder="Webhook name"
                      />
                      {webhook.lastStatus && (
                        <Badge variant={webhook.lastStatus === "success" ? "default" : "destructive"} className="gap-1">
                          {webhook.lastStatus === "success" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {webhook.lastStatus === "success" ? "OK" : "Error"}
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeWebhook(webhook.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Endpoint URL</Label>
                      <Input
                        value={webhook.url}
                        onChange={(e) => updateWebhook(webhook.id, { url: e.target.value })}
                        placeholder="https://api.example.com/webhook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secret (optional)</Label>
                      <Input
                        value={webhook.secret || ""}
                        onChange={(e) => updateWebhook(webhook.id, { secret: e.target.value })}
                        placeholder="Your webhook secret"
                        type="password"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Events</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {AVAILABLE_EVENTS.map((event) => (
                        <div key={event.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${webhook.id}-${event.id}`}
                            checked={webhook.events.includes(event.id)}
                            onCheckedChange={() => toggleEvent(webhook.id, event.id)}
                          />
                          <label htmlFor={`${webhook.id}-${event.id}`} className="text-sm cursor-pointer">
                            {event.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testWebhook(webhook)}
                      disabled={testing === webhook.id}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing === webhook.id ? "Testing..." : "Test Webhook"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={addWebhook}>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>

            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Payload Format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
            {`{
  "event": "order.paid",
  "timestamp": "2025-11-26T12:00:00Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-001",
    "total": 25.50,
    "payment_method": "cash",
    "items": [...]
  }
}`}
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            All webhooks include an <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header if a
            secret is configured.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

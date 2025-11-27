"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Printer, Save, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Settings {
  id?: string
  receipt_header?: string
  receipt_footer?: string
  receipt_width?: string
  print_logo?: boolean
  print_customer_copy?: boolean
  auto_print?: boolean
}

export function PrintSettings({ settings }: { settings: Settings | null }) {
  const [formData, setFormData] = useState({
    receipt_header: settings?.receipt_header || "Thank you for dining with us!",
    receipt_footer: settings?.receipt_footer || "Visit us again soon!\nFollow us: @myrestaurant\nwww.myrestaurant.com",
    receipt_width: settings?.receipt_width || "80mm",
    print_logo: settings?.print_logo ?? true,
    print_customer_copy: settings?.print_customer_copy ?? true,
    auto_print: settings?.auto_print ?? false,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      if (settings?.id) {
        await supabase.from("settings").update(formData).eq("id", settings.id)
      } else {
        await supabase.from("settings").insert(formData)
      }
      alert("Print settings saved!")
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
            <Printer className="h-5 w-5" />
            Receipt Configuration
          </CardTitle>
          <CardDescription>Customize your receipt template</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Receipt Width</Label>
              <Select
                value={formData.receipt_width}
                onValueChange={(v) => setFormData({ ...formData, receipt_width: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (Mini)</SelectItem>
                  <SelectItem value="80mm">80mm (Standard)</SelectItem>
                  <SelectItem value="A4">A4 Paper</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Header Message</Label>
            <Input
              value={formData.receipt_header}
              onChange={(e) => setFormData({ ...formData, receipt_header: e.target.value })}
              placeholder="Welcome message..."
            />
          </div>

          <div className="space-y-2">
            <Label>Footer Message</Label>
            <Textarea
              value={formData.receipt_footer}
              onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
              placeholder="Thank you message, social media, etc."
              rows={3}
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Print Logo</Label>
                <p className="text-sm text-muted-foreground">Include business logo on receipt</p>
              </div>
              <Switch
                checked={formData.print_logo}
                onCheckedChange={(checked) => setFormData({ ...formData, print_logo: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Customer Copy</Label>
                <p className="text-sm text-muted-foreground">Print duplicate receipt for customer</p>
              </div>
              <Switch
                checked={formData.print_customer_copy}
                onCheckedChange={(checked) => setFormData({ ...formData, print_customer_copy: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Print</Label>
                <p className="text-sm text-muted-foreground">Automatically print on payment complete</p>
              </div>
              <Switch
                checked={formData.auto_print}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_print: checked })}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Receipt Preview</DialogTitle>
                </DialogHeader>
                <div className="border rounded-lg p-4 bg-white font-mono text-xs max-w-[300px] mx-auto">
                  <div className="text-center border-b pb-2 mb-2">
                    <p className="font-bold text-sm">MY RESTAURANT</p>
                    <p>123 Main Street</p>
                    <p>+60 12-345 6789</p>
                  </div>
                  <p className="text-center text-[10px] mb-2">{formData.receipt_header}</p>
                  <div className="border-b border-dashed pb-2 mb-2">
                    <p>Order #: ORD-001</p>
                    <p>Date: 26/11/2025 12:00</p>
                    <p>Cashier: Ali</p>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between">
                      <span>1x Nasi Lemak</span>
                      <span>BND 12.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>2x Teh Tarik</span>
                      <span>BND 7.00</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed pt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>BND 19.00</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>TOTAL</span>
                      <span>BND 19.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cash</span>
                      <span>BND 20.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change</span>
                      <span>BND 1.00</span>
                    </div>
                  </div>
                  <div className="text-center mt-4 text-[10px] whitespace-pre-line">{formData.receipt_footer}</div>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Printer, RefreshCw, Save } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface PrinterDevice {
  id: string
  name: string
}

interface PrinterConfigProps {
  settings: any
  onUpdate?: () => void
}

export function PrinterConfig({ settings, onUpdate }: PrinterConfigProps) {
  const [printerType, setPrinterType] = useState(settings?.printer_type || "browser")
  const [printerDeviceId, setPrinterDeviceId] = useState(settings?.printer_device_id || "")
  const [receiptWidth, setReceiptWidth] = useState(settings?.receipt_width_mm || 80)
  const [showItemImages, setShowItemImages] = useState(settings?.show_item_images ?? false)
  const [showLogo, setShowLogo] = useState(settings?.show_logo ?? true)
  const [showBusinessName, setShowBusinessName] = useState(settings?.show_business_name ?? true)
  const [showFooterImage, setShowFooterImage] = useState(settings?.show_footer_image ?? false)
  const [marginTop, setMarginTop] = useState(settings?.printer_margin_top || 0)
  const [marginBottom, setMarginBottom] = useState(settings?.printer_margin_bottom || 0)
  const [devices, setDevices] = useState<PrinterDevice[]>([])
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testPrinting, setTestPrinting] = useState(false)

  const scanPrinters = async () => {
    setScanning(true)
    try {
      // Request USB device access
      if ("usb" in navigator) {
        const usbDevices = await (navigator as any).usb.getDevices()
        const printerDevices = usbDevices.map((device: any) => ({
          id: device.serialNumber || device.productId,
          name: device.productName || "USB Printer",
        }))
        setDevices(printerDevices)
      }

      // Also check for Bluetooth devices if available
      if ("bluetooth" in navigator) {
        try {
          const bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
            filters: [{ services: ["printing"] }],
          })
          setDevices((prev) => [
            ...prev,
            {
              id: bluetoothDevice.id,
              name: bluetoothDevice.name || "Bluetooth Printer",
            },
          ])
        } catch (e) {
          // User cancelled or no bluetooth devices
        }
      }

      // Add browser printing option
      setDevices((prev) => [{ id: "browser", name: "Browser Print (PDF)" }, ...prev])
    } catch (error) {
      console.error("[v0] Printer scan error:", error)
    } finally {
      setScanning(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("settings")
        .update({
          printer_type: printerType,
          printer_device_id: printerDeviceId,
          receipt_width_mm: receiptWidth,
          show_item_images: showItemImages,
          show_logo: showLogo,
          show_business_name: showBusinessName,
          show_footer_image: showFooterImage,
          printer_margin_top: marginTop,
          printer_margin_bottom: marginBottom,
        })
        .eq("id", settings?.id)

      if (error) throw error

      alert("Printer settings saved!")
      onUpdate?.()
    } catch (error) {
      console.error("[v0] Save printer settings error:", error)
      alert("Failed to save printer settings")
    } finally {
      setSaving(false)
    }
  }

  const handleTestPrint = () => {
    setTestPrinting(true)
    // Trigger browser print
    window.print()
    setTimeout(() => setTestPrinting(false), 1000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Konfigurasi Printer
        </CardTitle>
        <CardDescription>Setup printer dan format resit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Printer Type */}
        <div className="space-y-2">
          <Label>Jenis Printer</Label>
          <Select value={printerType} onValueChange={setPrinterType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="browser">Browser Print (PDF)</SelectItem>
              <SelectItem value="thermal">Thermal Printer (ESC/POS)</SelectItem>
              <SelectItem value="epson">Epson TM Series</SelectItem>
              <SelectItem value="star">Star TSP Series</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Device Selection */}
        {printerType !== "browser" && (
          <div className="space-y-2">
            <Label>Pilih Device</Label>
            <div className="flex gap-2">
              <Select value={printerDeviceId} onValueChange={setPrinterDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Scan untuk cari printer..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={scanPrinters} disabled={scanning}>
                {scanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Receipt Width */}
        <div className="space-y-2">
          <Label>Lebar Resit</Label>
          <Select value={receiptWidth.toString()} onValueChange={(v) => setReceiptWidth(Number.parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="58">58mm (Mini)</SelectItem>
              <SelectItem value="80">80mm (Standard)</SelectItem>
              <SelectItem value="210">A4 (210mm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Display Options */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-sm">Display Options</h4>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tunjuk Logo</Label>
              <p className="text-xs text-muted-foreground">Papar logo perniagaan di resit</p>
            </div>
            <Switch checked={showLogo} onCheckedChange={setShowLogo} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tunjuk Nama Perniagaan</Label>
              <p className="text-xs text-muted-foreground">Papar nama dan alamat perniagaan</p>
            </div>
            <Switch checked={showBusinessName} onCheckedChange={setShowBusinessName} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tunjuk Gambar Item</Label>
              <p className="text-xs text-muted-foreground">Papar gambar produk dalam resit</p>
            </div>
            <Switch checked={showItemImages} onCheckedChange={setShowItemImages} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tunjuk Footer Image</Label>
              <p className="text-xs text-muted-foreground">Papar footer image di bahagian bawah</p>
            </div>
            <Switch checked={showFooterImage} onCheckedChange={setShowFooterImage} />
          </div>
        </div>

        {/* Margins */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Top Margin (mm)</Label>
            <Input
              type="number"
              value={marginTop}
              onChange={(e) => setMarginTop(Number.parseInt(e.target.value) || 0)}
              min="0"
              max="50"
            />
          </div>
          <div className="space-y-2">
            <Label>Bottom Margin (mm)</Label>
            <Input
              type="number"
              value={marginBottom}
              onChange={(e) => setMarginBottom(Number.parseInt(e.target.value) || 0)}
              min="0"
              max="50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleTestPrint} disabled={testPrinting}>
            {testPrinting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Printing...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Test Print
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

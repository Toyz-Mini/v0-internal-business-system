"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Camera, MapPin, Clock, Save, Loader2, Calculator } from "lucide-react"

interface AttendanceSettingsProps {
  settings?: {
    attendance_photo_required?: boolean
    attendance_geo_required?: boolean
    late_threshold_minutes?: number
    ot_auto_approve?: boolean
    working_hours_start?: string
    working_hours_end?: string
    standard_work_hours_per_day?: number
    break_duration_hours?: number
    ot_rate_multiplier?: number
    ot_requires_approval?: boolean
  } | null
}

export function AttendanceSettings({ settings }: AttendanceSettingsProps) {
  const [photoRequired, setPhotoRequired] = useState(settings?.attendance_photo_required ?? true)
  const [geoRequired, setGeoRequired] = useState(settings?.attendance_geo_required ?? true)
  const [lateThreshold, setLateThreshold] = useState(settings?.late_threshold_minutes ?? 15)
  const [otAutoApprove, setOtAutoApprove] = useState(settings?.ot_auto_approve ?? false)
  const [workStart, setWorkStart] = useState(settings?.working_hours_start ?? "09:00")
  const [workEnd, setWorkEnd] = useState(settings?.working_hours_end ?? "18:00")
  const [standardWorkHours, setStandardWorkHours] = useState(settings?.standard_work_hours_per_day ?? 8)
  const [breakDuration, setBreakDuration] = useState(settings?.break_duration_hours ?? 1)
  const [otRateMultiplier, setOtRateMultiplier] = useState(settings?.ot_rate_multiplier ?? 1.5)
  const [otRequiresApproval, setOtRequiresApproval] = useState(settings?.ot_requires_approval ?? false)
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createClient()

  async function handleSave() {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          attendance_photo_required: photoRequired,
          attendance_geo_required: geoRequired,
          late_threshold_minutes: lateThreshold,
          ot_auto_approve: otAutoApprove,
          working_hours_start: workStart,
          working_hours_end: workEnd,
          standard_work_hours_per_day: standardWorkHours,
          break_duration_hours: breakDuration,
          ot_rate_multiplier: otRateMultiplier,
          ot_requires_approval: otRequiresApproval,
        })
        .eq("id", settings?.id || (await supabase.from("settings").select("id").single()).data?.id)

      if (error) throw error
      toast.success("Tetapan kehadiran disimpan")
    } catch (error) {
      console.error(error)
      toast.error("Gagal menyimpan tetapan")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Tetapan Kehadiran & OT
        </CardTitle>
        <CardDescription>
          Konfigurasi keperluan clock in/out dan pengiraan OT berasaskan tempoh kerja (Duration-Based)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Clock In/Out Requirements */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Keperluan Clock In/Out</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Wajib Gambar Selfie
              </Label>
              <p className="text-sm text-muted-foreground">Pekerja mesti ambil gambar semasa clock in/out</p>
            </div>
            <Switch checked={photoRequired} onCheckedChange={setPhotoRequired} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Wajib Geolokasi
              </Label>
              <p className="text-sm text-muted-foreground">Rekod lokasi GPS semasa clock in/out</p>
            </div>
            <Switch checked={geoRequired} onCheckedChange={setGeoRequired} />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <h3 className="text-sm font-semibold">Pengiraan OT (Duration-Based)</h3>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-blue-900 mb-1">Formula OT:</p>
            <p className="text-blue-800">Working Hours = (Clock Out - Clock In) - Break</p>
            <p className="text-blue-800">OT Hours = max(0, Working Hours - Standard Hours)</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="standardWorkHours">Standard Working Hours Per Day</Label>
              <Input
                id="standardWorkHours"
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={standardWorkHours}
                onChange={(e) => setStandardWorkHours(Number.parseFloat(e.target.value) || 8)}
              />
              <p className="text-xs text-muted-foreground">Default: 8 jam/hari</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="breakDuration">Break Duration (jam)</Label>
              <Input
                id="breakDuration"
                type="number"
                min={0}
                max={4}
                step={0.5}
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number.parseFloat(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">Akan ditolak automatik</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otRate">OT Rate Multiplier</Label>
              <Select
                value={otRateMultiplier.toString()}
                onValueChange={(v) => setOtRateMultiplier(Number.parseFloat(v))}
              >
                <SelectTrigger id="otRate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.0">1.0x (Normal)</SelectItem>
                  <SelectItem value="1.5">1.5x (Standard)</SelectItem>
                  <SelectItem value="2.0">2.0x (Double)</SelectItem>
                  <SelectItem value="2.5">2.5x (Custom)</SelectItem>
                  <SelectItem value="3.0">3.0x (Triple)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Kadar bayaran OT</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label>OT Requires Manager Approval</Label>
              <p className="text-sm text-muted-foreground">OT perlu kelulusan admin sebelum dikira dalam gaji</p>
            </div>
            <Switch checked={otRequiresApproval} onCheckedChange={setOtRequiresApproval} />
          </div>
        </div>

        {/* Working Hours & Late Threshold */}
        <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="lateThreshold">Threshold Lewat (minit)</Label>
            <Input
              id="lateThreshold"
              type="number"
              min={0}
              max={60}
              value={lateThreshold}
              onChange={(e) => setLateThreshold(Number.parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Ditanda lewat jika clock in selepas threshold ini</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workStart">Waktu Mula Kerja</Label>
            <Input id="workStart" type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workEnd">Waktu Tamat Kerja</Label>
            <Input id="workEnd" type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} size="lg" className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Simpan Tetapan
            </>
          )}
        </Button>

        <div className="space-y-2 pt-4 border-t">
          <Label className="text-sm font-semibold">Contoh Pengiraan OT:</Label>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span>9 AM – 6 PM (9 jam total - 1 jam break)</span>
              <span className="font-medium">= 8 jam kerja, 0 OT</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span>9 AM – 7 PM (10 jam total - 1 jam break)</span>
              <span className="font-medium text-orange-600">= 9 jam kerja, 1 OT</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span>2 PM – 11 PM (9 jam total - 1 jam break)</span>
              <span className="font-medium">= 8 jam kerja, 0 OT</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span>2 PM – 12 AM (10 jam total - 1 jam break)</span>
              <span className="font-medium text-orange-600">= 9 jam kerja, 1 OT</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Save, Building, DollarSign, Truck, CalendarDays, Clock, Calculator } from "lucide-react"

interface Settings {
  id?: string
  business_name?: string
  address?: string
  phone?: string
  tax_rate?: number
  service_charge_rate?: number
  enable_loyalty?: boolean
  loyalty_points_per_rm?: number
  currency?: string
  enable_takeaway?: boolean
  enable_gomamam?: boolean
  enable_walkin?: boolean
  annual_leave_days?: number
  medical_leave_days?: number
  enable_unpaid_leave?: boolean
  enable_paid_leave?: boolean
  enable_replacement_leave?: boolean
  ot_rate_multiplier?: number
  ot_start_hour?: number
  require_ot_approval?: boolean
  payroll_day?: number
  enable_epf?: boolean
  enable_socso?: boolean
}

export function BusinessSettings({ settings }: { settings: Settings | null }) {
  const [formData, setFormData] = useState({
    business_name: settings?.business_name || "AbangBob Ayam Gunting",
    address: settings?.address || "",
    phone: settings?.phone || "",
    tax_rate: settings?.tax_rate || 0,
    service_charge_rate: settings?.service_charge_rate || 0,
    enable_loyalty: settings?.enable_loyalty || false,
    loyalty_points_per_rm: settings?.loyalty_points_per_rm || 1,
    currency: settings?.currency || "BND",
    enable_takeaway: settings?.enable_takeaway ?? true,
    enable_gomamam: settings?.enable_gomamam ?? true,
    enable_walkin: settings?.enable_walkin ?? true,
    annual_leave_days: settings?.annual_leave_days || 14,
    medical_leave_days: settings?.medical_leave_days || 14,
    enable_unpaid_leave: settings?.enable_unpaid_leave ?? true,
    enable_paid_leave: settings?.enable_paid_leave ?? true,
    enable_replacement_leave: settings?.enable_replacement_leave ?? true,
    ot_rate_multiplier: settings?.ot_rate_multiplier || 1.5,
    ot_start_hour: settings?.ot_start_hour || 18,
    require_ot_approval: settings?.require_ot_approval ?? true,
    payroll_day: settings?.payroll_day || 25,
    enable_epf: settings?.enable_epf ?? false,
    enable_socso: settings?.enable_socso ?? false,
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
      toast.success("Tetapan berjaya disimpan")
    } catch (error) {
      toast.error("Gagal menyimpan tetapan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Business Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Maklumat Perniagaan
          </CardTitle>
          <CardDescription>Maklumat asas perniagaan anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nama Perniagaan</Label>
              <Input
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Nama kedai"
              />
            </div>
            <div className="space-y-2">
              <Label>No. Telefon</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+673 XXX XXXX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alamat</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Alamat penuh"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Currency & Tax */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Mata Wang & Cukai
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Mata Wang</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BND">BND - Brunei Dollar</SelectItem>
                  <SelectItem value="MYR">MYR - Ringgit Malaysia</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kadar Cukai (%)</Label>
              <Input
                type="number"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Service Charge (%)</Label>
              <Input
                type="number"
                value={formData.service_charge_rate}
                onChange={(e) => setFormData({ ...formData, service_charge_rate: Number(e.target.value) })}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          {/* Loyalty Section */}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Program Kesetiaan</Label>
              <p className="text-sm text-muted-foreground">Aktifkan sistem mata ganjaran</p>
            </div>
            <Switch
              checked={formData.enable_loyalty}
              onCheckedChange={(checked) => setFormData({ ...formData, enable_loyalty: checked })}
            />
          </div>
          {formData.enable_loyalty && (
            <div className="space-y-2">
              <Label>Mata per BND dibelanjakan</Label>
              <Input
                type="number"
                value={formData.loyalty_points_per_rm}
                onChange={(e) => setFormData({ ...formData, loyalty_points_per_rm: Number(e.target.value) })}
                min="1"
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Jenis Pesanan
          </CardTitle>
          <CardDescription>Aktifkan jenis pesanan yang tersedia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Walk-in</Label>
              <p className="text-sm text-muted-foreground">Pelanggan makan di kedai</p>
            </div>
            <Switch
              checked={formData.enable_walkin}
              onCheckedChange={(checked) => setFormData({ ...formData, enable_walkin: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Takeaway</Label>
              <p className="text-sm text-muted-foreground">Pelanggan bawa balik</p>
            </div>
            <Switch
              checked={formData.enable_takeaway}
              onCheckedChange={(checked) => setFormData({ ...formData, enable_takeaway: checked })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>GoMamam</Label>
              <p className="text-sm text-muted-foreground">Penghantaran melalui GoMamam</p>
            </div>
            <Switch
              checked={formData.enable_gomamam}
              onCheckedChange={(checked) => setFormData({ ...formData, enable_gomamam: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Tetapan Cuti
          </CardTitle>
          <CardDescription>Konfigurasi baki dan jenis cuti</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cuti Tahunan (hari)</Label>
              <Input
                type="number"
                value={formData.annual_leave_days}
                onChange={(e) => setFormData({ ...formData, annual_leave_days: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cuti Sakit (hari)</Label>
              <Input
                type="number"
                value={formData.medical_leave_days}
                onChange={(e) => setFormData({ ...formData, medical_leave_days: Number(e.target.value) })}
              />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label>Jenis Cuti Dibenarkan</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cuti Tanpa Gaji (Unpaid Leave)</span>
              <Switch
                checked={formData.enable_unpaid_leave}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_unpaid_leave: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cuti Dengan Gaji (Paid Leave)</span>
              <Switch
                checked={formData.enable_paid_leave}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_paid_leave: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Cuti Gantian (Replacement Leave)</span>
              <Switch
                checked={formData.enable_replacement_leave}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_replacement_leave: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tetapan OT (Kerja Lebih Masa)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kadar OT (x gaji biasa)</Label>
              <Select
                value={String(formData.ot_rate_multiplier)}
                onValueChange={(value) => setFormData({ ...formData, ot_rate_multiplier: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1.0x (Biasa)</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2.0x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mula OT (jam)</Label>
              <Select
                value={String(formData.ot_start_hour)}
                onValueChange={(value) => setFormData({ ...formData, ot_start_hour: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="17">5:00 PM</SelectItem>
                  <SelectItem value="18">6:00 PM</SelectItem>
                  <SelectItem value="19">7:00 PM</SelectItem>
                  <SelectItem value="20">8:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Perlukan Kelulusan OT</Label>
              <p className="text-sm text-muted-foreground">OT perlu diluluskan oleh pengurus</p>
            </div>
            <Switch
              checked={formData.require_ot_approval}
              onCheckedChange={(checked) => setFormData({ ...formData, require_ot_approval: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tetapan Gaji
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hari Pembayaran Gaji</Label>
            <Select
              value={String(formData.payroll_day)}
              onValueChange={(value) => setFormData({ ...formData, payroll_day: Number(value) })}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 5, 10, 15, 20, 25, 28, 30].map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day} haribulan
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label>Potongan Statutori</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">EPF / TAP</span>
              <Switch
                checked={formData.enable_epf}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_epf: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">SOCSO / SCP</span>
              <Switch
                checked={formData.enable_socso}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_socso: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-32">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Menyimpan..." : "Simpan Tetapan"}
        </Button>
      </div>
    </div>
  )
}

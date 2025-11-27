"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Upload, ImageIcon, Trash2, Loader2 } from "lucide-react"
import Image from "next/image"

interface LogoUploadProps {
  currentLogoUrl?: string | null
  currentFooterUrl?: string | null
  onUpdate?: () => void
}

export function LogoUpload({ currentLogoUrl, currentFooterUrl, onUpdate }: LogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl || null)
  const [footerUrl, setFooterUrl] = useState(currentFooterUrl || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFooter, setUploadingFooter] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "footer") => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert("File terlalu besar. Maksimum 2MB")
      return
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Format tidak disokong. Gunakan JPG, PNG, atau WebP")
      return
    }

    const setUploading = type === "logo" ? setUploadingLogo : setUploadingFooter
    setUploading(true)

    const supabase = createClient()

    try {
      // Upload to storage
      const fileName = `${type}-${Date.now()}.${file.name.split(".").pop()}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from("branding").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("branding").getPublicUrl(uploadData.path)

      // Update settings
      const columnName = type === "logo" ? "receipt_logo_url" : "receipt_footer_image_url"
      const { error: updateError } = await supabase
        .from("settings")
        .update({ [columnName]: publicUrl })
        .eq("id", (await supabase.from("settings").select("id").single()).data?.id)

      if (updateError) throw updateError

      // Update local state
      if (type === "logo") {
        setLogoUrl(publicUrl)
      } else {
        setFooterUrl(publicUrl)
      }

      onUpdate?.()
    } catch (error) {
      console.error("[v0] Logo upload error:", error)
      alert(`Gagal upload ${type}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (type: "logo" | "footer") => {
    if (!confirm(`Padam ${type === "logo" ? "logo" : "footer image"}?`)) return

    const setUploading = type === "logo" ? setUploadingLogo : setUploadingFooter
    setUploading(true)

    const supabase = createClient()

    try {
      // Delete from storage
      const url = type === "logo" ? logoUrl : footerUrl
      if (url) {
        const path = url.split("/").pop()
        if (path) {
          await supabase.storage.from("branding").remove([path])
        }
      }

      // Update settings
      const columnName = type === "logo" ? "receipt_logo_url" : "receipt_footer_image_url"
      const { error } = await supabase
        .from("settings")
        .update({ [columnName]: null })
        .eq("id", (await supabase.from("settings").select("id").single()).data?.id)

      if (error) throw error

      // Update local state
      if (type === "logo") {
        setLogoUrl(null)
      } else {
        setFooterUrl(null)
      }

      onUpdate?.()
    } catch (error) {
      console.error("[v0] Delete error:", error)
      alert("Gagal padam")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Branding & Imej
        </CardTitle>
        <CardDescription>Upload logo dan footer image untuk resit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Logo Perniagaan</Label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                <Image src={logoUrl || "/placeholder.svg"} alt="Business Logo" fill className="object-contain p-2" />
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={uploadingLogo}
                onClick={() => document.getElementById("logo-upload")?.click()}
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {logoUrl ? "Tukar Logo" : "Upload Logo"}
                  </>
                )}
              </Button>
              {logoUrl && (
                <Button variant="destructive" size="sm" disabled={uploadingLogo} onClick={() => handleDelete("logo")}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Padam
                </Button>
              )}
              <input
                id="logo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleLogoUpload(e, "logo")}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Format: JPG, PNG, WebP. Maksimum 2MB. Saiz disyorkan: 300x300px
          </p>
        </div>

        {/* Footer Image Upload */}
        <div className="space-y-3 pt-4 border-t">
          <Label>Footer Image (Optional)</Label>
          <div className="flex items-center gap-4">
            {footerUrl ? (
              <div className="relative w-48 h-24 border rounded-lg overflow-hidden bg-gray-50">
                <Image src={footerUrl || "/placeholder.svg"} alt="Receipt Footer" fill className="object-contain p-2" />
              </div>
            ) : (
              <div className="w-48 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={uploadingFooter}
                onClick={() => document.getElementById("footer-upload")?.click()}
              >
                {uploadingFooter ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {footerUrl ? "Tukar Footer" : "Upload Footer"}
                  </>
                )}
              </Button>
              {footerUrl && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={uploadingFooter}
                  onClick={() => handleDelete("footer")}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Padam
                </Button>
              )}
              <input
                id="footer-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleLogoUpload(e, "footer")}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Footer image untuk QR code, social media, atau promosi. Saiz disyorkan: 400x200px
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

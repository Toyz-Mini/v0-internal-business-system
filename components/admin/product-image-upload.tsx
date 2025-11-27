"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Camera, Upload, X, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"

interface ProductImage {
  storage_path: string
  public_url: string
  is_primary: boolean
}

interface ProductImageUploadProps {
  images: ProductImage[]
  onChange: (images: ProductImage[]) => void
}

export function ProductImageUpload({ images, onChange }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPEG, PNG, and WebP images are allowed",
        variant: "destructive",
      })
      return
    }

    // Validate file size (3MB)
    if (file.size > 3145728) {
      toast({
        title: "File too large",
        description: "Image must be less than 3MB",
        variant: "destructive",
      })
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    await uploadImage(file)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/product-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const { storage_path, public_url } = await response.json()

      // Add to images array
      const newImages = [
        ...images,
        {
          storage_path,
          public_url,
          is_primary: images.length === 0, // First image is primary
        },
      ]
      onChange(newImages)

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      })

      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    // If removed image was primary, make first image primary
    if (newImages.length > 0 && images[index].is_primary) {
      newImages[0].is_primary = true
    }
    onChange(newImages)
  }

  const setPrimaryImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }))
    onChange(newImages)
  }

  return (
    <div className="space-y-4">
      <Label>Product Images</Label>

      {/* Upload Buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute("capture")
              fileInputRef.current.click()
            }
          }}
          disabled={uploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Preview */}
      {preview && (
        <Card className="p-4">
          <img src={preview || "/placeholder.svg"} alt="Preview" className="h-32 w-full rounded object-cover" />
          <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
        </Card>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((image, index) => (
            <Card key={index} className="relative overflow-hidden p-2">
              <img
                src={image.public_url || "/placeholder.svg"}
                alt={`Product ${index + 1}`}
                className="h-32 w-full rounded object-cover"
              />

              {/* Actions */}
              <div className="mt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant={image.is_primary ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPrimaryImage(index)}
                  className="text-xs"
                >
                  {image.is_primary ? "Primary" : "Set Primary"}
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && !preview && (
        <p className="text-sm text-muted-foreground">No images uploaded. Take a photo or upload from device.</p>
      )}
    </div>
  )
}

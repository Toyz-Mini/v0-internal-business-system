import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Upload auth error:", authError)
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userError) {
      console.error("[v0] User lookup error:", userError)
      return NextResponse.json({ error: "Failed to verify user role" }, { status: 500 })
    }

    if (!userData || userData.role !== "admin") {
      console.error("[v0] User not admin:", userData?.role)
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" }, { status: 400 })
    }

    // Validate file size (max 3MB)
    if (file.size > 3145728) {
      return NextResponse.json({ error: "File size exceeds 3MB limit" }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `products/${fileName}`

    console.log("[v0] Uploading file:", { filePath, fileType: file.type, fileSize: file.size })

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] Storage upload error:", uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    console.log("[v0] Upload successful:", uploadData)

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(filePath)

    return NextResponse.json({
      storage_path: filePath,
      public_url: publicUrl,
      file_name: fileName,
    })
  } catch (error: any) {
    console.error("[v0] Upload API exception:", error)
    return NextResponse.json({ error: `Internal server error: ${error?.message || "Unknown error"}` }, { status: 500 })
  }
}

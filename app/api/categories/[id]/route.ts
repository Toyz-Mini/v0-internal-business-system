import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { categoryService } from "@/lib/services/categories"
import { updateCategorySchema } from "@/lib/validation/products"
import { z } from "zod"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const category = await categoryService.getById(id)

    return NextResponse.json({ data: category })
  } catch (error: any) {
    console.error("[API] Get category error:", error)

    if (error.message === "Category not found") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch category" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const validated = updateCategorySchema.parse(body)

    const category = await categoryService.update(id, validated)

    return NextResponse.json({ data: category })
  } catch (error: any) {
    console.error("[API] Update category error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error?.message || "Failed to update category" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { id } = await params

    await categoryService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete category error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete category" }, { status: 500 })
  }
}

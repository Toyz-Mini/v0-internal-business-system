import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { categoryService } from "@/lib/services/categories"
import { createCategorySchema } from "@/lib/validation/products"
import { z } from "zod"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const filters = {
      is_active: searchParams.get("is_active") !== "false",
    }

    const categories = await categoryService.list(filters)

    return NextResponse.json({ data: categories })
  } catch (error: any) {
    console.error("[API] Get categories error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch categories" }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const body = await request.json()

    const validated = createCategorySchema.parse(body)

    const category = await categoryService.create(validated)

    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create category error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error?.message || "Failed to create category" }, { status: 500 })
  }
}

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { productService } from "@/lib/services/products"
import { createProductSchema } from "@/lib/validation/products"
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
      category_id: searchParams.get("category_id") || undefined,
      is_active: searchParams.get("is_active") !== "false",
      search: searchParams.get("search") || undefined,
    }

    const products = await productService.list(filters)

    return NextResponse.json({ data: products })
  } catch (error: any) {
    console.error("[API] Get products error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch products" }, { status: 500 })
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

    const validated = createProductSchema.parse(body)

    const product = await productService.create(validated)

    return NextResponse.json({ data: product }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create product error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error?.message || "Failed to create product" }, { status: 500 })
  }
}

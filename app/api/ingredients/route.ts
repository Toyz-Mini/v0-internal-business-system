import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { inventoryService } from "@/lib/services/inventory"

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
      search: searchParams.get("search") || undefined,
      low_stock: searchParams.get("low_stock") === "true",
    }

    const ingredients = await inventoryService.list(filters)

    return NextResponse.json({ data: ingredients })
  } catch (error: any) {
    console.error("[API] Get ingredients error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch ingredients" }, { status: 500 })
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

    const ingredient = await inventoryService.create(body)

    return NextResponse.json({ data: ingredient }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create ingredient error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create ingredient" }, { status: 500 })
  }
}

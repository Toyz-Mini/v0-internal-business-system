import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { supplierService } from "@/lib/services/suppliers"

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
      is_active: searchParams.get("is_active") !== "false",
    }

    const suppliers = await supplierService.list(filters)

    return NextResponse.json({ data: suppliers })
  } catch (error: any) {
    console.error("[API] Get suppliers error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch suppliers" }, { status: 500 })
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

    const supplier = await supplierService.create(body)

    return NextResponse.json({ data: supplier }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create supplier error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create supplier" }, { status: 500 })
  }
}

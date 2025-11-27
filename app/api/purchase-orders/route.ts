import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { purchaseOrderService } from "@/lib/services/purchase-orders"

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
      supplier_id: searchParams.get("supplier_id") || undefined,
      status: searchParams.get("status") || undefined,
    }

    const pos = await purchaseOrderService.list(filters)

    return NextResponse.json({ data: pos })
  } catch (error: any) {
    console.error("[API] Get purchase orders error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch purchase orders" }, { status: 500 })
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

    const po = await purchaseOrderService.create(body, user.id)

    return NextResponse.json({ data: po }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create purchase order error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create purchase order" }, { status: 500 })
  }
}

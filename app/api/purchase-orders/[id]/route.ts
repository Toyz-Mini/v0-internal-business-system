import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { purchaseOrderService } from "@/lib/services/purchase-orders"

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

    const po = await purchaseOrderService.getById(id)

    return NextResponse.json({ data: po })
  } catch (error: any) {
    console.error("[API] Get purchase order error:", error)

    if (error.message === "Purchase order not found") {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch purchase order" }, { status: 500 })
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

    const po = await purchaseOrderService.update(id, body)

    return NextResponse.json({ data: po })
  } catch (error: any) {
    console.error("[API] Update purchase order error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update purchase order" }, { status: 500 })
  }
}

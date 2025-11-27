import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { purchaseOrderService } from "@/lib/services/purchase-orders"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const po = await purchaseOrderService.receive(id, user.id)

    return NextResponse.json({ data: po })
  } catch (error: any) {
    console.error("[API] Receive purchase order error:", error)
    return NextResponse.json({ error: error?.message || "Failed to receive purchase order" }, { status: 500 })
  }
}

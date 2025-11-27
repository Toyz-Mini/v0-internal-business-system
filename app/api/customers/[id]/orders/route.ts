import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { customerService } from "@/lib/services/customers"

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

    const orders = await customerService.getOrders(id)

    return NextResponse.json({ data: orders })
  } catch (error: any) {
    console.error("[API] Get customer orders error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch customer orders" }, { status: 500 })
  }
}

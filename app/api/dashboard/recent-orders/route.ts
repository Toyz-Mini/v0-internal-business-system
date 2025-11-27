import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { dashboardService } from "@/lib/services/dashboard"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orders = await dashboardService.getRecentOrders()

    return NextResponse.json({ data: orders })
  } catch (error: any) {
    console.error("[API] Get recent orders error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch recent orders" }, { status: 500 })
  }
}

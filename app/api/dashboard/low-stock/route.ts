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

    const lowStock = await dashboardService.getLowStock()

    return NextResponse.json({ data: lowStock })
  } catch (error: any) {
    console.error("[API] Get low stock error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch low stock items" }, { status: 500 })
  }
}

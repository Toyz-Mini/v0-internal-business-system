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

    const staff = await dashboardService.getClockedInStaff()

    return NextResponse.json({ data: staff })
  } catch (error: any) {
    console.error("[API] Get clocked in staff error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch clocked in staff" }, { status: 500 })
  }
}

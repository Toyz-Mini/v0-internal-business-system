import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { reportsService } from "@/lib/services/reports"

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

    const date_from = searchParams.get("date_from")
    const date_to = searchParams.get("date_to")

    if (!date_from || !date_to) {
      return NextResponse.json({ error: "date_from and date_to are required" }, { status: 400 })
    }

    const report = await reportsService.getProductPerformance({ date_from, date_to })

    return NextResponse.json({ data: report })
  } catch (error: any) {
    console.error("[API] Get product performance error:", error)
    return NextResponse.json({ error: error?.message || "Failed to generate product performance report" }, { status: 500 })
  }
}

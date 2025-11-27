import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { attendanceService } from "@/lib/services/attendance"

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
      employee_id: searchParams.get("employee_id") || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
    }

    const attendance = await attendanceService.list(filters)

    return NextResponse.json({ data: attendance })
  } catch (error: any) {
    console.error("[API] Get attendance error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch attendance" }, { status: 500 })
  }
}

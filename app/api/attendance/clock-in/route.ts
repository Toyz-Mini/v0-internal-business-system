import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { attendanceService } from "@/lib/services/attendance"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { employee_id, clock_in_lat, clock_in_lng } = body

    if (!employee_id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 })
    }

    const attendance = await attendanceService.clockIn({
      employee_id,
      clock_in_lat,
      clock_in_lng,
    })

    return NextResponse.json({ data: attendance }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Clock in error:", error)
    return NextResponse.json({ error: error?.message || "Failed to clock in" }, { status: 500 })
  }
}

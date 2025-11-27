import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from("leave_applications")
      .select(
        `
        *,
        employee:employees(id, name, position),
        approver:users!leave_applications_approved_by_fkey(id, name)
      `,
      )
      .order("start_date", { ascending: false })

    // Filters
    const status = searchParams.get("status")
    const employeeId = searchParams.get("employee_id")
    const leaveType = searchParams.get("leave_type")
    const year = searchParams.get("year")

    if (status) {
      query = query.eq("status", status)
    }

    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    if (leaveType) {
      query = query.eq("leave_type", leaveType)
    }

    if (year) {
      query = query.gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("[API] Get leave applications error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch leave applications" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { employee_id, leave_type, start_date, end_date, total_days, reason, attachment_url } = body

    // Validation
    if (!employee_id || !leave_type || !start_date || !end_date || !total_days) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate dates
    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    // Check leave balance if applicable
    if (["annual", "replacement", "medical"].includes(leave_type)) {
      const year = new Date(start_date).getFullYear()

      const { data: balanceData } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("year", year)
        .single()

      if (balanceData) {
        const balanceField =
          leave_type === "annual"
            ? "annual_balance"
            : leave_type === "medical"
              ? "medical_balance"
              : "replacement_balance"

        if (balanceData[balanceField] < total_days) {
          return NextResponse.json(
            { error: `Insufficient ${leave_type} leave balance. Available: ${balanceData[balanceField]} days` },
            { status: 400 },
          )
        }
      } else {
        // Initialize leave balance for employee
        await supabase.rpc("initialize_leave_balance", {
          p_employee_id: employee_id,
          p_year: year,
        })
      }
    }

    // Insert leave application
    const { data, error } = await supabase
      .from("leave_applications")
      .insert({
        employee_id,
        leave_type,
        start_date,
        end_date,
        total_days: Number.parseFloat(total_days),
        reason,
        attachment_url,
        status: "pending",
        application_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create leave application error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create leave application" }, { status: 500 })
  }
}

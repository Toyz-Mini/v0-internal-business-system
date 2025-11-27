import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { startOfMonth, endOfMonth } from "date-fns"

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

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    // Get month parameter (format: YYYY-MM)
    const month = searchParams.get("month")
    if (!month) {
      return NextResponse.json({ error: "Month parameter is required (format: YYYY-MM)" }, { status: 400 })
    }

    const [year, monthNum] = month.split("-").map(Number)
    const startDate = startOfMonth(new Date(year, monthNum - 1))
    const endDate = endOfMonth(new Date(year, monthNum - 1))

    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from("employees")
      .select("id, full_name, position, salary_type, salary_rate, hourly_rate, ot_rate")
      .eq("is_active", true)
      .order("full_name")

    if (empError) throw empError

    // Get attendance records for the month
    const { data: attendanceRecords, error: attError } = await supabase
      .from("attendance")
      .select("employee_id, total_hours, ot_hours, date")
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .not("clock_out", "is", null)

    if (attError) throw attError

    // Calculate payroll for each employee
    const payrollData = employees.map((emp) => {
      const empAttendance = attendanceRecords.filter((att) => att.employee_id === emp.id)

      const totalHours = empAttendance.reduce((sum, att) => sum + (Number(att.total_hours) || 0), 0)
      const totalOtHours = empAttendance.reduce((sum, att) => sum + (Number(att.ot_hours) || 0), 0)

      let baseSalary = 0
      let otPay = 0

      if (emp.salary_type === "hourly") {
        baseSalary = totalHours * (emp.hourly_rate || 0)
        otPay = totalOtHours * (emp.ot_rate || emp.hourly_rate * 1.5 || 0)
      } else if (emp.salary_type === "monthly") {
        baseSalary = emp.salary_rate || 0
        // For monthly employees, OT is calculated based on hourly rate if provided
        if (emp.hourly_rate > 0) {
          otPay = totalOtHours * (emp.ot_rate || emp.hourly_rate * 1.5 || 0)
        }
      }

      return {
        employee_id: emp.id,
        employee_name: emp.full_name,
        position: emp.position,
        salary_type: emp.salary_type,
        total_hours: totalHours,
        total_ot_hours: totalOtHours,
        base_salary: baseSalary,
        ot_pay: otPay,
        total_salary: baseSalary + otPay,
        days_worked: empAttendance.length,
        status: "pending",
      }
    })

    // Calculate summary
    const summary = {
      total_employees: payrollData.length,
      total_payroll: payrollData.reduce((sum, p) => sum + p.total_salary, 0),
      total_base_salary: payrollData.reduce((sum, p) => sum + p.base_salary, 0),
      total_ot_pay: payrollData.reduce((sum, p) => sum + p.ot_pay, 0),
      total_hours: payrollData.reduce((sum, p) => sum + p.total_hours, 0),
      total_ot_hours: payrollData.reduce((sum, p) => sum + p.total_ot_hours, 0),
    }

    return NextResponse.json({
      month,
      summary,
      payroll: payrollData,
    })
  } catch (error: any) {
    console.error("[API] Get payroll error:", error)
    return NextResponse.json({ error: error?.message || "Failed to calculate payroll" }, { status: 500 })
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

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { month, payroll_data } = body

    if (!month || !payroll_data) {
      return NextResponse.json({ error: "Month and payroll_data are required" }, { status: 400 })
    }

    // In a production system, you would:
    // 1. Create payroll records in a payroll table
    // 2. Generate pay slips
    // 3. Send notifications to employees
    // 4. Update payment status

    // For now, we'll just return success
    // You can extend this to create actual payroll records

    return NextResponse.json({
      success: true,
      message: `Payroll processed for ${month}`,
      processed_count: payroll_data.length,
    })
  } catch (error: any) {
    console.error("[API] Process payroll error:", error)
    return NextResponse.json({ error: error?.message || "Failed to process payroll" }, { status: 500 })
  }
}

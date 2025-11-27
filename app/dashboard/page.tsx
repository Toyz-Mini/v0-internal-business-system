import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import type { UserRole } from "@/lib/types"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase.from("users").select("*").eq("email", user.email).single()

  const userRole = (userProfile?.role || "staff") as UserRole
  const userName = userProfile?.name || user.email || "User"

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let todaySales = 0
  let todayOrders = 0
  let todayExpenses = 0
  let lowStockItems: any[] = []
  let clockedInStaff: any[] = []

  try {
    const ordersResult = await supabase
      .from("orders")
      .select("total")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())

    todaySales = ordersResult.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    todayOrders = ordersResult.data?.length || 0

    const expensesResult = await supabase
      .from("expenses")
      .select("amount")
      .eq("expense_date", today.toISOString().split("T")[0])

    todayExpenses = expensesResult.data?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

    const ingredientsResult = await supabase.from("ingredients").select("*").eq("is_active", true)

    lowStockItems = (ingredientsResult.data || []).filter((item) => {
      const currentStock = Number(item.current_stock) || 0
      const minStock = Number(item.min_stock) || 0
      return currentStock <= minStock
    })

    const attendanceResult = await supabase
      .from("attendance")
      .select("id, employee_id, clock_in, clock_out")
      .gte("clock_in", today.toISOString())
      .is("clock_out", null)

    if (attendanceResult.data && attendanceResult.data.length > 0) {
      const employeeIds = attendanceResult.data
        .map((a) => a.employee_id)
        .filter((id): id is string => id !== null && id !== undefined)

      if (employeeIds.length > 0) {
        const employeesResult = await supabase.from("employees").select("id, name, position").in("id", employeeIds)
        const employeeMap = new Map(employeesResult.data?.map((e) => [e.id, e]) || [])

        clockedInStaff = attendanceResult.data.map((att) => ({
          ...att,
          employee: employeeMap.get(att.employee_id) || null,
        }))
      }
    }
  } catch (error) {
    console.error("Dashboard data fetch error:", error)
  }

  // Pass all data to client component for rendering
  return (
    <DashboardClient
      userRole={userRole}
      userName={userName}
      todaySales={todaySales}
      todayOrders={todayOrders}
      todayExpenses={todayExpenses}
      lowStockItems={lowStockItems}
      clockedInStaff={clockedInStaff}
    />
  )
}

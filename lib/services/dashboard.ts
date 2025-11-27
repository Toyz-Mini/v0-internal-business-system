import { createClient } from "@/lib/supabase/server"
import { startOfDay, endOfDay } from "date-fns"

export class DashboardService {
  async getStats() {
    const supabase = await createClient()

    const today = new Date()
    const startDate = startOfDay(today).toISOString()
    const endDate = endOfDay(today).toISOString()

    const { data: todayOrders } = await supabase
      .from("orders")
      .select("total, payment_status")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .eq("payment_status", "paid")

    const todaySales = todayOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0
    const todayOrderCount = todayOrders?.length || 0

    const { count: totalOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")

    const { count: totalCustomers } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })

    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)

    return {
      today_sales: Number(todaySales.toFixed(2)),
      today_orders: todayOrderCount,
      total_orders: totalOrders || 0,
      total_customers: totalCustomers || 0,
      total_products: totalProducts || 0,
    }
  }

  async getLowStock(limit: number = 10) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("ingredients")
      .select(`
        id,
        name,
        unit,
        current_stock,
        min_stock,
        supplier:suppliers(name)
      `)
      .filter("current_stock", "lte", "min_stock")
      .order("current_stock")
      .limit(limit)

    if (error) throw error

    return data
  }

  async getRecentOrders(limit: number = 10) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        total,
        payment_method,
        payment_status,
        created_at,
        customer:customers(name)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return data
  }

  async getClockedInStaff() {
    const supabase = await createClient()

    const today = new Date().toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("attendance")
      .select(`
        id,
        clock_in,
        employee:employees(id, full_name, position)
      `)
      .eq("date", today)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })

    if (error) throw error

    return data
  }
}

export const dashboardService = new DashboardService()

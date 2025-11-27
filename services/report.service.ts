import { createClient } from "@/lib/supabase/server"

export interface DailyStats {
  date: string
  total_sales: number
  order_count: number
  avg_order_value: number
}

export interface TopItem {
  product_name: string
  quantity_sold: number
  total_revenue: number
}

export interface CategoryStats {
  category_name: string
  total_sales: number
  order_count: number
  item_count: number
}

export class ReportService {
  static async getDailyStats(startDate: Date, endDate: Date): Promise<DailyStats[]> {
    const supabase = await createClient()

    const { data: orders } = await supabase
      .from("orders")
      .select("created_at, total")
      .eq("payment_status", "paid")
      .gte("created_at", startDate.toISOString())
      .lt("created_at", endDate.toISOString())
      .order("created_at", { ascending: true })

    if (!orders || orders.length === 0) {
      return []
    }

    const dailyMap = new Map<string, { total: number; count: number }>()

    orders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split("T")[0]
      const existing = dailyMap.get(date) || { total: 0, count: 0 }
      existing.total += order.total
      existing.count += 1
      dailyMap.set(date, existing)
    })

    return Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      total_sales: stats.total,
      order_count: stats.count,
      avg_order_value: stats.total / stats.count,
    }))
  }

  static async getTopItems(startDate: Date, endDate: Date, limit = 5): Promise<TopItem[]> {
    const supabase = await createClient()

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_name, quantity, subtotal, order:orders!inner(created_at, payment_status)")
      .gte("order.created_at", startDate.toISOString())
      .lt("order.created_at", endDate.toISOString())
      .eq("order.payment_status", "paid")

    if (!orderItems || orderItems.length === 0) {
      return []
    }

    const itemMap = new Map<string, { quantity: number; revenue: number }>()

    orderItems.forEach((item: any) => {
      const name = item.product_name
      const existing = itemMap.get(name) || { quantity: 0, revenue: 0 }
      existing.quantity += item.quantity
      existing.revenue += item.subtotal
      itemMap.set(name, existing)
    })

    return Array.from(itemMap.entries())
      .map(([product_name, stats]) => ({
        product_name,
        quantity_sold: stats.quantity,
        total_revenue: stats.revenue,
      }))
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, limit)
  }

  static async getTopCategories(startDate: Date, endDate: Date): Promise<CategoryStats[]> {
    const supabase = await createClient()

    const { data: orderItems } = await supabase
      .from("order_items")
      .select(
        "product_name, quantity, subtotal, product:products!left(category_id), order:orders!inner(created_at, payment_status)",
      )
      .gte("order.created_at", startDate.toISOString())
      .lt("order.created_at", endDate.toISOString())
      .eq("order.payment_status", "paid")

    if (!orderItems || orderItems.length === 0) {
      return []
    }

    const categoryIds = new Set<string>()
    const categoryMap = new Map<string, { sales: number; orders: Set<string>; items: number }>()

    orderItems.forEach((item: any) => {
      const categoryId = item.product?.category_id
      if (categoryId) {
        categoryIds.add(categoryId)
        const existing = categoryMap.get(categoryId) || { sales: 0, orders: new Set(), items: 0 }
        existing.sales += item.subtotal
        existing.items += item.quantity
        categoryMap.set(categoryId, existing)
      }
    })

    if (categoryIds.size === 0) {
      return []
    }

    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", Array.from(categoryIds))

    const categoryNameMap = new Map(categories?.map((c) => [c.id, c.name]) || [])

    return Array.from(categoryMap.entries())
      .map(([categoryId, stats]) => ({
        category_name: categoryNameMap.get(categoryId) || "Unknown",
        total_sales: stats.sales,
        order_count: stats.orders.size,
        item_count: stats.items,
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
  }

  static async getWeeklySummary(weekStart: Date): Promise<{
    total_sales: number
    order_count: number
    avg_order_value: number
  }> {
    const supabase = await createClient()
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const { data: orders } = await supabase
      .from("orders")
      .select("total")
      .eq("payment_status", "paid")
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString())

    if (!orders || orders.length === 0) {
      return { total_sales: 0, order_count: 0, avg_order_value: 0 }
    }

    const total_sales = orders.reduce((sum, o) => sum + o.total, 0)
    const order_count = orders.length
    const avg_order_value = total_sales / order_count

    return { total_sales, order_count, avg_order_value }
  }

  static async getMonthlySummary(monthStart: Date): Promise<{
    total_sales: number
    order_count: number
    avg_order_value: number
  }> {
    const supabase = await createClient()
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const { data: orders } = await supabase
      .from("orders")
      .select("total")
      .eq("payment_status", "paid")
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString())

    if (!orders || orders.length === 0) {
      return { total_sales: 0, order_count: 0, avg_order_value: 0 }
    }

    const total_sales = orders.reduce((sum, o) => sum + o.total, 0)
    const order_count = orders.length
    const avg_order_value = total_sales / order_count

    return { total_sales, order_count, avg_order_value }
  }
}

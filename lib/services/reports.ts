import { createClient } from "@/lib/supabase/server"

export interface SalesReportFilters {
  date_from: string
  date_to: string
}

export class ReportsService {
  async getSalesReport(filters: SalesReportFilters) {
    const supabase = await createClient()

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        total,
        subtotal,
        tax,
        discount,
        payment_method,
        payment_status,
        created_at,
        customer:customers(name)
      `)
      .gte("created_at", filters.date_from)
      .lte("created_at", filters.date_to)
      .order("created_at", { ascending: false })

    if (error) throw error

    const totalSales = orders?.reduce((sum, order) => {
      if (order.payment_status === "paid") {
        return sum + Number(order.total)
      }
      return sum
    }, 0) || 0

    const totalOrders = orders?.filter((o) => o.payment_status === "paid").length || 0

    const paymentMethodBreakdown = orders?.reduce((acc: any, order) => {
      if (order.payment_status === "paid") {
        const method = order.payment_method
        acc[method] = (acc[method] || 0) + Number(order.total)
      }
      return acc
    }, {})

    return {
      date_from: filters.date_from,
      date_to: filters.date_to,
      total_sales: Number(totalSales.toFixed(2)),
      total_orders: totalOrders,
      average_order_value: totalOrders > 0 ? Number((totalSales / totalOrders).toFixed(2)) : 0,
      payment_method_breakdown: paymentMethodBreakdown,
      orders,
    }
  }

  async getProductPerformance(filters: SalesReportFilters) {
    const supabase = await createClient()

    const { data: orderItems, error } = await supabase
      .from("order_items")
      .select(`
        product_id,
        product_name,
        quantity,
        price,
        subtotal,
        order:orders!inner(created_at, payment_status)
      `)
      .gte("order.created_at", filters.date_from)
      .lte("order.created_at", filters.date_to)
      .eq("order.payment_status", "paid")

    if (error) throw error

    const productStats = orderItems?.reduce((acc: any, item: any) => {
      const productId = item.product_id
      if (!acc[productId]) {
        acc[productId] = {
          product_id: productId,
          product_name: item.product_name,
          total_quantity: 0,
          total_revenue: 0,
        }
      }
      acc[productId].total_quantity += item.quantity
      acc[productId].total_revenue += Number(item.subtotal)
      return acc
    }, {})

    const sortedProducts = Object.values(productStats || {}).sort(
      (a: any, b: any) => b.total_revenue - a.total_revenue
    )

    return {
      date_from: filters.date_from,
      date_to: filters.date_to,
      products: sortedProducts,
    }
  }
}

export const reportsService = new ReportsService()

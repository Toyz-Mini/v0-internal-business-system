"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ReportFilters } from "./report-filters"
import { DollarSign, ShoppingCart, TrendingUp, ArrowDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Order, User } from "@/lib/types"

interface AdvancedSalesReportProps {
  initialOrders: Order[]
  cashiers: User[]
}

export function AdvancedSalesReport({ initialOrders, cashiers }: AdvancedSalesReportProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    cashier: "all",
    paymentMethod: "all",
  })

  const fetchOrders = useCallback(async () => {
    if (!filters.startDate || !filters.endDate) return

    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from("orders")
      .select("*, cashier:users(*), items:order_items(*)")
      .gte("created_at", `${filters.startDate}T00:00:00`)
      .lte("created_at", `${filters.endDate}T23:59:59`)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })

    if (filters.cashier !== "all") {
      query = query.eq("cashier_id", filters.cashier)
    }
    if (filters.paymentMethod !== "all") {
      query = query.eq("payment_method", filters.paymentMethod)
    }

    const { data } = await query
    if (data) setOrders(data)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchOrders()
    }
  }, [filters, fetchOrders])

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const exportCSV = () => {
    const headers = ["Order #", "Date", "Time", "Cashier", "Items", "Subtotal", "Discount", "Total", "Payment"]
    const rows = orders.map((o) => [
      o.order_number,
      new Date(o.created_at).toLocaleDateString("ms-MY"),
      new Date(o.created_at).toLocaleTimeString("ms-MY"),
      o.cashier?.name || "-",
      o.items?.length || 0,
      o.subtotal.toFixed(2),
      o.discount_amount.toFixed(2),
      o.total.toFixed(2),
      o.payment_method,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sales-report-${filters.startDate}-${filters.endDate}.csv`
    a.click()
  }

  // Calculate stats
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = orders.length
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0
  const totalDiscount = orders.reduce((sum, o) => sum + o.discount_amount, 0)

  // Payment breakdown
  const paymentBreakdown = orders.reduce(
    (acc, o) => {
      acc[o.payment_method] = (acc[o.payment_method] || 0) + o.total
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="space-y-6">
      <ReportFilters
        onFilterChange={handleFilterChange}
        onExport={exportCSV}
        cashiers={cashiers.map((c) => ({ id: c.id, name: c.name }))}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">BND {totalSales.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">BND {avgOrderValue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDown className="h-4 w-4" />
              Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">BND {totalDiscount.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(paymentBreakdown).map(([method, amount]) => (
              <div key={method} className="flex items-center gap-2">
                <Badge variant="outline">
                  {method === "cash" ? "Tunai" : method === "qrpay" ? "QR Pay" : "Transfer"}
                </Badge>
                <span className="font-medium">BND {amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No orders found for selected filters</p>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 50).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <p>{new Date(order.created_at).toLocaleDateString("ms-MY")}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString("ms-MY", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{order.cashier?.name || "-"}</TableCell>
                      <TableCell>{order.items?.length || 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.payment_method === "cash"
                            ? "Tunai"
                            : order.payment_method === "qrpay"
                              ? "QR"
                              : "Transfer"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">BND {order.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

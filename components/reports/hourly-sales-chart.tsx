"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Order } from "@/lib/types"

interface HourlySalesChartProps {
  orders: Order[]
}

export function HourlySalesChart({ orders }: HourlySalesChartProps) {
  // Group sales by hour
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourOrders = orders.filter((o) => {
      const orderHour = new Date(o.created_at).getHours()
      return orderHour === hour
    })

    return {
      hour,
      sales: hourOrders.reduce((sum, o) => sum + o.total, 0),
      count: hourOrders.length,
    }
  })

  const maxSales = Math.max(...hourlyData.map((h) => h.sales), 1)

  // Only show business hours (8am - 10pm)
  const businessHours = hourlyData.filter((h) => h.hour >= 8 && h.hour <= 22)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Sales by Hour</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No sales today</p>
        ) : (
          <div className="space-y-2">
            {businessHours.map((data) => (
              <div key={data.hour} className="flex items-center gap-3">
                <span className="w-12 text-xs text-muted-foreground">{data.hour.toString().padStart(2, "0")}:00</span>
                <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((data.sales / maxSales) * 100, data.sales > 0 ? 10 : 0)}%` }}
                  >
                    {data.sales > 0 && (
                      <span className="text-xs font-medium text-primary-foreground">BND {data.sales.toFixed(0)}</span>
                    )}
                  </div>
                </div>
                <span className="w-8 text-xs text-muted-foreground text-right">{data.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

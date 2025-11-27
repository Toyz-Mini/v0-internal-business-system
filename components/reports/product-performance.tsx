"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { OrderItem } from "@/lib/types"

interface ProductPerformanceProps {
  orderItems: OrderItem[]
}

export function ProductPerformance({ orderItems }: ProductPerformanceProps) {
  // Aggregate by product
  const productStats = orderItems.reduce(
    (acc, item) => {
      const name = item.product_name
      if (!acc[name]) {
        acc[name] = { name, quantity: 0, revenue: 0 }
      }
      acc[name].quantity += item.quantity
      acc[name].revenue += item.subtotal
      return acc
    },
    {} as Record<string, { name: string; quantity: number; revenue: number }>,
  )

  // Sort by quantity sold
  const sortedProducts = Object.values(productStats)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  const maxQty = sortedProducts[0]?.quantity || 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products (30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedProducts.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No sales data</p>
        ) : (
          <ul className="space-y-3">
            {sortedProducts.map((product, index) => (
              <li key={product.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {index === 0 && <Badge>Best Seller</Badge>}
                    <span className="font-medium">{product.name}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {product.quantity} sold • BND {product.revenue.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(product.quantity / maxQty) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

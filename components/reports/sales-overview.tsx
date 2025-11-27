import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react"
import type { Order } from "@/lib/types"

interface SalesOverviewProps {
  todayOrders: Order[]
  weekOrders: Order[]
  monthOrders: Order[]
}

export function SalesOverview({ todayOrders, weekOrders, monthOrders }: SalesOverviewProps) {
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const weekSales = weekOrders.reduce((sum, o) => sum + o.total, 0)
  const monthSales = monthOrders.reduce((sum, o) => sum + o.total, 0)

  const avgOrderToday = todayOrders.length > 0 ? todaySales / todayOrders.length : 0
  const avgOrderWeek = weekOrders.length > 0 ? weekSales / weekOrders.length : 0
  const avgOrderMonth = monthOrders.length > 0 ? monthSales / monthOrders.length : 0

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">BND {todaySales.toFixed(2)}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {todayOrders.length} orders
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Avg: BND {avgOrderToday.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">BND {weekSales.toFixed(2)}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {weekOrders.length} orders
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Avg: BND {avgOrderWeek.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">BND {monthSales.toFixed(2)}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {monthOrders.length} orders
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Avg: BND {avgOrderMonth.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

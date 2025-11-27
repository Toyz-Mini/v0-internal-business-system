import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, ShoppingCart, Star } from "lucide-react"

interface CustomerStatsProps {
  totalCustomers: number
  totalRevenue: number
  avgOrderValue: number
  loyalCustomers: number
}

export function CustomerStats({ totalCustomers, totalRevenue, avgOrderValue, loyalCustomers }: CustomerStatsProps) {
  const stats = [
    {
      title: "Total Customers",
      value: totalCustomers.toLocaleString(),
      icon: Users,
    },
    {
      title: "Total Revenue",
      value: `BND ${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
    },
    {
      title: "Avg Order Value",
      value: `BND ${avgOrderValue.toFixed(2)}`,
      icon: ShoppingCart,
    },
    {
      title: "Loyal Customers",
      value: loyalCustomers.toLocaleString(),
      description: "5+ orders",
      icon: Star,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

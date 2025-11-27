"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, TrendingUp, Package } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface DailyStats {
  date: string
  total_sales: number
  order_count: number
  avg_order_value: number
}

interface TopItem {
  product_name: string
  quantity_sold: number
  total_revenue: number
}

interface CategoryStats {
  category_name: string
  total_sales: number
  order_count: number
  item_count: number
}

export function SalesDashboard() {
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState<DailyStats | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<{ total_sales: number; order_count: number; avg_order_value: number } | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<{ total_sales: number; order_count: number; avg_order_value: number } | null>(null)
  const [dailyData, setDailyData] = useState<DailyStats[]>([])
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [topCategories, setTopCategories] = useState<CategoryStats[]>([])

  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    try {
      setLoading(true)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - 7)

      const monthStart = new Date(today)
      monthStart.setMonth(monthStart.getMonth() - 1)

      const [dailyRes, weeklyRes, monthlyRes, topItemsRes, topCategoriesRes] = await Promise.all([
        fetch(`/api/reports/daily?start_date=${sevenDaysAgo.toISOString()}&end_date=${tomorrow.toISOString()}`),
        fetch(`/api/reports/weekly?week_start=${weekStart.toISOString()}`),
        fetch(`/api/reports/monthly?month_start=${monthStart.toISOString()}`),
        fetch(`/api/reports/top-items?start_date=${monthStart.toISOString()}&end_date=${tomorrow.toISOString()}&limit=5`),
        fetch(`/api/reports/top-categories?start_date=${monthStart.toISOString()}&end_date=${tomorrow.toISOString()}`),
      ])

      const dailyData = await dailyRes.json()
      const weeklyData = await weeklyRes.json()
      const monthlyData = await monthlyRes.json()
      const topItemsData = await topItemsRes.json()
      const topCategoriesData = await topCategoriesRes.json()

      if (dailyData.success) {
        setDailyData(dailyData.data)
        const todayStr = today.toISOString().split("T")[0]
        const todayStat = dailyData.data.find((d: DailyStats) => d.date === todayStr)
        setTodayStats(todayStat || { date: todayStr, total_sales: 0, order_count: 0, avg_order_value: 0 })
      }

      if (weeklyData.success) {
        setWeeklyStats(weeklyData.data)
      }

      if (monthlyData.success) {
        setMonthlyStats(monthlyData.data)
      }

      if (topItemsData.success) {
        setTopItems(topItemsData.data)
      }

      if (topCategoriesData.success) {
        setTopCategories(topCategoriesData.data)
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Jualan Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">BND {(todayStats?.total_sales || 0).toFixed(2)}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {todayStats?.order_count || 0} orders
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Jualan Minggu Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">BND {(weeklyStats?.total_sales || 0).toFixed(2)}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {weeklyStats?.order_count || 0} orders
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Jualan Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">BND {(monthlyStats?.total_sales || 0).toFixed(2)}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {monthlyStats?.order_count || 0} orders
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Purata Nilai Order (AOV)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">BND {(todayStats?.avg_order_value || 0).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-2">Hari ini</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jualan Harian (7 Hari)</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Tiada data lagi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleDateString("ms-MY", { month: "short", day: "numeric" })
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`BND ${value.toFixed(2)}`, "Jualan"]}
                    labelFormatter={(label) => {
                      const date = new Date(label)
                      return date.toLocaleDateString("ms-MY", { weekday: "long", month: "long", day: "numeric" })
                    }}
                  />
                  <Line type="monotone" dataKey="total_sales" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jualan Mengikut Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Tiada data lagi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCategories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category_name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`BND ${value.toFixed(2)}`, "Jualan"]} />
                  <Bar dataKey="total_sales" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Paling Laku (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Tiada data lagi
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-right">Kuantiti</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topItems.map((item, index) => (
                    <TableRow key={item.product_name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Badge variant="default">Best</Badge>}
                          {item.product_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity_sold}</TableCell>
                      <TableCell className="text-right">BND {item.total_revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kategori Popular</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Tiada data lagi
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Item Terjual</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCategories.map((category) => (
                    <TableRow key={category.category_name}>
                      <TableCell className="font-medium">{category.category_name}</TableCell>
                      <TableCell className="text-right">{category.item_count}</TableCell>
                      <TableCell className="text-right">BND {category.total_sales.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

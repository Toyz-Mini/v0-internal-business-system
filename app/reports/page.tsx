import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { AdvancedSalesReport } from "@/components/reports/advanced-sales-report"
import { ProductPerformance } from "@/components/reports/product-performance"
import { HourlySalesChart } from "@/components/reports/hourly-sales-chart"
import type { UserRole } from "@/lib/types"

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase.from("users").select("*").eq("email", user.email).single()

  const userRole = (userProfile?.role || "staff") as UserRole
  const userName = userProfile?.name || user.email || "User"

  if (userRole === "staff") {
    redirect("/dashboard")
  }

  // Get dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Fetch data
  const [ordersResult, orderItemsResult, cashiersResult] = await Promise.all([
    supabase
      .from("orders")
      .select("*, cashier:users(*), items:order_items(*)")
      .gte("created_at", weekAgo.toISOString())
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false }),
    supabase.from("order_items").select("*, order:orders(created_at)").gte("created_at", weekAgo.toISOString()),
    supabase.from("users").select("id, name").in("role", ["admin", "cashier"]),
  ])

  const todayOrders = (ordersResult.data || []).filter((o) => new Date(o.created_at) >= today)

  return (
    <AppShell title="Reports" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Sales Analytics</h2>
          <p className="text-muted-foreground">View detailed sales reports with filters and export options</p>
        </div>

        <AdvancedSalesReport initialOrders={ordersResult.data || []} cashiers={cashiersResult.data || []} />

        <div className="grid gap-6 lg:grid-cols-2">
          <ProductPerformance orderItems={orderItemsResult.data || []} />
          <HourlySalesChart orders={todayOrders} />
        </div>
      </div>
    </AppShell>
  )
}

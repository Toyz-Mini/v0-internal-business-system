import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { ExpensesTable } from "@/components/expenses/expenses-table"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { ProfitLossCard } from "@/components/expenses/profit-loss-card"
import type { UserRole } from "@/lib/types"

export default async function ExpensesPage() {
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

  if (userRole !== "admin") {
    redirect("/dashboard")
  }

  // Get current month date range
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [categoriesResult, expensesResult, ordersResult, stockLogsResult] = await Promise.all([
    supabase.from("expense_categories").select("*").order("name"),
    supabase
      .from("expenses")
      .select("*, category:expense_categories(*)")
      .gte("expense_date", startOfMonth.toISOString().split("T")[0])
      .lte("expense_date", endOfMonth.toISOString().split("T")[0])
      .order("expense_date", { ascending: false }),
    supabase
      .from("orders")
      .select("total, created_at")
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString()),
    supabase
      .from("stock_logs")
      .select("*, ingredient:ingredients(cost_per_unit)")
      .eq("type", "out")
      .gte("created_at", startOfMonth.toISOString())
      .lte("created_at", endOfMonth.toISOString()),
  ])

  // Calculate P&L
  const revenue = ordersResult.data?.reduce((sum, o) => sum + o.total, 0) || 0
  const expenses = expensesResult.data?.reduce((sum, e) => sum + e.amount, 0) || 0
  const cogs =
    stockLogsResult.data?.reduce((sum, log) => {
      const cost = log.quantity * (log.ingredient?.cost_per_unit || 0)
      return sum + cost
    }, 0) || 0

  return (
    <AppShell title="Expenses" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Expenses & P&L</h2>
            <p className="text-muted-foreground">
              {startOfMonth.toLocaleDateString("ms-MY", { month: "long", year: "numeric" })}
            </p>
          </div>
          <AddExpenseDialog categories={categoriesResult.data || []} userId={userProfile?.id} />
        </div>

        <ProfitLossCard revenue={revenue} cogs={cogs} expenses={expenses} />

        <ExpensesTable expenses={expensesResult.data || []} categories={categoriesResult.data || []} />
      </div>
    </AppShell>
  )
}

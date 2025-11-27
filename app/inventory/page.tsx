import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { AddStockDialog } from "@/components/inventory/add-stock-dialog"
import { AddIngredientDialog } from "@/components/inventory/add-ingredient-dialog"
import { StockLogsDialog } from "@/components/inventory/stock-logs-dialog"
import { PurchaseOrdersDialog } from "@/components/inventory/purchase-orders-dialog"
import { RecomputeStockButton } from "@/components/inventory/recompute-stock-button"
import type { UserRole } from "@/lib/types"

export default async function InventoryPage() {
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

  if (!["admin", "manager", "kitchen"].includes(userRole)) {
    redirect("/dashboard")
  }

  const [ingredientsResult, suppliersResult, stockLogsCount] = await Promise.all([
    supabase.from("ingredients").select("*, supplier:suppliers!fk_ingredient_supplier(*)").order("name"),
    supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
    supabase.from("stock_logs").select("id", { count: "exact", head: true }),
  ])

  const hasStockLogs = (stockLogsCount.count || 0) > 0
  const ingredients = ingredientsResult.data || []

  return (
    <AppShell title="Inventory" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Inventory Management</h2>
            <p className="text-muted-foreground">Manage your ingredients and stock levels</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["admin", "manager"].includes(userRole) && (
              <>
                <RecomputeStockButton hasStockLogs={hasStockLogs} />
                <PurchaseOrdersDialog suppliers={suppliersResult.data || []} ingredients={ingredients} />
                <StockLogsDialog />
                <AddStockDialog />
                <AddIngredientDialog suppliers={suppliersResult.data || []} />
              </>
            )}
          </div>
        </div>

        <InventoryTable ingredients={ingredients} suppliers={suppliersResult.data || []} userRole={userRole} />

        {ingredientsResult.error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            <p className="font-medium">Query Error:</p>
            <pre className="text-sm">{JSON.stringify(ingredientsResult.error, null, 2)}</pre>
          </div>
        )}
      </div>
    </AppShell>
  )
}

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { SuppliersTable } from "@/components/suppliers/suppliers-table"
import { AddSupplierDialog } from "@/components/suppliers/add-supplier-dialog"
import type { UserRole } from "@/lib/types"

export default async function SuppliersPage() {
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

  const { data: suppliers } = await supabase.from("suppliers").select("*").order("name")

  return (
    <AppShell title="Suppliers" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Supplier Management</h2>
            <p className="text-muted-foreground">Manage your ingredient suppliers</p>
          </div>
          <AddSupplierDialog />
        </div>

        <SuppliersTable suppliers={suppliers || []} />
      </div>
    </AppShell>
  )
}

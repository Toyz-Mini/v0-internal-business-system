import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { CustomersTable } from "@/components/customers/customers-table"
import { AddCustomerDialog } from "@/components/customers/add-customer-dialog"
import { CustomerStats } from "@/components/customers/customer-stats"
import { WhatsAppExport } from "@/components/customers/whatsapp-export"
import type { UserRole } from "@/lib/types"

export default async function CustomersPage() {
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

  const customersResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/customers`, {
    cache: 'no-store'
  });
  const customersData = await customersResponse.json();
  const customers = customersData.success ? customersData.data : [];

  const totalCustomers = customers.length || 0
  const totalRevenue = customers.reduce((sum: number, c: any) => sum + (c.total_spent || 0), 0) || 0
  const avgOrderValue =
    totalCustomers > 0 ? totalRevenue / (customers.reduce((sum: number, c: any) => sum + c.order_count, 0) || 1) : 0
  const loyalCustomers = customers.filter((c: any) => c.order_count >= 5).length || 0

  return (
    <AppShell title="Customers" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Customer CRM</h2>
            <p className="text-muted-foreground">Manage your customer database</p>
          </div>
          <div className="flex gap-2">
            <WhatsAppExport customers={customers || []} />
            <AddCustomerDialog />
          </div>
        </div>

        <CustomerStats
          totalCustomers={totalCustomers}
          totalRevenue={totalRevenue}
          avgOrderValue={avgOrderValue}
          loyalCustomers={loyalCustomers}
        />

        <CustomersTable customers={customers || []} />
      </div>
    </AppShell>
  )
}

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { EmployeesTable } from "@/components/employees/employees-table"
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog"
import { AttendanceReportDialog } from "@/components/employees/attendance-report-dialog"
import type { UserRole } from "@/lib/types"

export default async function EmployeesPage() {
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

  const { data: employees } = await supabase.from("employees").select("*").order("name")

  return (
    <AppShell title="HR / Staff" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Employee Management</h2>
            <p className="text-muted-foreground">Manage staff profiles and attendance</p>
          </div>
          <div className="flex gap-2">
            <AttendanceReportDialog employees={employees || []} />
            <AddEmployeeDialog />
          </div>
        </div>

        <EmployeesTable employees={employees || []} />
      </div>
    </AppShell>
  )
}

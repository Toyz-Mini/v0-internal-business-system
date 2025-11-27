import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { AttendancePanel } from "@/components/attendance/attendance-panel"
import { AttendanceHistory } from "@/components/attendance/attendance-history"
import type { UserRole } from "@/lib/types"

export default async function AttendancePage() {
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

  // Get employees for selection
  const { data: employees } = await supabase.from("employees").select("*").eq("is_active", true).order("name")

  // Get today's attendance
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: todayAttendance } = await supabase
    .from("attendance")
    .select("*, employee:employees(*)")
    .gte("clock_in", today.toISOString())
    .lt("clock_in", tomorrow.toISOString())
    .order("clock_in", { ascending: false })

  return (
    <AppShell title="Attendance" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-muted-foreground">Clock in/out and view attendance records</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AttendancePanel employees={employees || []} />
          <AttendanceHistory attendance={todayAttendance || []} />
        </div>
      </div>
    </AppShell>
  )
}

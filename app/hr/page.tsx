"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Clock, FileText, Calendar, TrendingUp, CheckCircle } from "lucide-react"
import Link from "next/link"
import type { Claim, LeaveApplication } from "@/lib/types"

export default function HRDashboardPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    clockedInToday: 0,
    pendingClaims: 0,
    pendingLeaves: 0,
    pendingOT: 0,
  })
  const [recentClaims, setRecentClaims] = useState<Claim[]>([])
  const [recentLeaves, setRecentLeaves] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split("T")[0]

      // Get employee stats
      const { data: employees, error: empError } = await supabase.from("employees").select("id, is_active")
      if (empError) throw empError

      const totalEmployees = employees?.length || 0
      const activeEmployees = employees?.filter((e) => e.is_active).length || 0

      // Get today's attendance
      const { data: attendance } = await supabase
        .from("attendance")
        .select("id")
        .gte("clock_in", `${today}T00:00:00`)
        .lte("clock_in", `${today}T23:59:59`)
      const clockedInToday = attendance?.length || 0

      // Get pending claims (may not exist yet)
      let pendingClaims = 0
      let claimsData: Claim[] = []
      try {
        const { data: claims, count } = await supabase
          .from("claims")
          .select("*, employee:employees(name)", { count: "exact" })
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5)
        pendingClaims = count || 0
        claimsData = claims || []
      } catch (e) {
        // Table may not exist
      }

      // Get pending leaves (may not exist yet)
      let pendingLeaves = 0
      let leavesData: LeaveApplication[] = []
      try {
        const { data: leaves, count } = await supabase
          .from("leave_applications")
          .select("*, employee:employees(name)", { count: "exact" })
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5)
        pendingLeaves = count || 0
        leavesData = leaves || []
      } catch (e) {
        // Table may not exist
      }

      // Get pending OT approvals
      let pendingOT = 0
      try {
        const { count } = await supabase
          .from("attendance")
          .select("id", { count: "exact" })
          .not("ot_clock_in", "is", null)
          .eq("ot_approved", false)
        pendingOT = count || 0
      } catch (e) {
        // Column may not exist
      }

      setStats({
        totalEmployees,
        activeEmployees,
        clockedInToday,
        pendingClaims,
        pendingLeaves,
        pendingOT,
      })
      setRecentClaims(claimsData)
      setRecentLeaves(leavesData)
      setError(null)
    } catch (err: any) {
      console.error("[v0] HR Dashboard error:", err)
      setError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">HR Dashboard</h1>
            <p className="text-muted-foreground">Urus pekerja, kehadiran, tuntutan & cuti</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            <p className="font-medium">Error loading data</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                      <p className="text-xs text-muted-foreground">Jumlah Pekerja</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.activeEmployees}</p>
                      <p className="text-xs text-muted-foreground">Aktif</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.clockedInToday}</p>
                      <p className="text-xs text-muted-foreground">Hadir Hari Ini</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <FileText className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pendingClaims}</p>
                      <p className="text-xs text-muted-foreground">Tuntutan Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pendingLeaves}</p>
                      <p className="text-xs text-muted-foreground">Cuti Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pendingOT}</p>
                      <p className="text-xs text-muted-foreground">OT Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/hr/employees">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Senarai Pekerja</p>
                  <p className="text-sm text-muted-foreground">Urus profil pekerja</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hr/attendance">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-semibold">Kehadiran</p>
                  <p className="text-sm text-muted-foreground">Rekod & kelulusan OT</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hr/claims">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-semibold">Tuntutan</p>
                  <p className="text-sm text-muted-foreground">Mileage & lain-lain</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/hr/leave">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="font-semibold">Cuti</p>
                  <p className="text-sm text-muted-foreground">Permohonan & baki</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pending Approvals */}
        {!loading && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pending Claims */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Tuntutan Pending</CardTitle>
                  <Link href="/hr/claims">
                    <Button variant="ghost" size="sm">
                      Lihat Semua
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentClaims.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Tiada tuntutan pending</p>
                ) : (
                  <div className="space-y-3">
                    {recentClaims.map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{(claim as any).employee?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {claim.claim_type === "mileage" ? "Mileage" : "Lain-lain"} - BND {claim.amount.toFixed(2)}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Leaves */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Permohonan Cuti Pending</CardTitle>
                  <Link href="/hr/leave">
                    <Button variant="ghost" size="sm">
                      Lihat Semua
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentLeaves.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Tiada permohonan cuti pending</p>
                ) : (
                  <div className="space-y-3">
                    {recentLeaves.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{(leave as any).employee?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} - {leave.total_days}{" "}
                            hari
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                          Pending
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  )
}

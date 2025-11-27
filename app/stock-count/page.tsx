"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClipboardList, ClipboardCheck, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { ms } from "date-fns/locale"
import type { StockCount, Shift, User } from "@/lib/types"

export default function StockCountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [recentCounts, setRecentCounts] = useState<StockCount[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<StockCount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()
        setCurrentUser(userData)
      }

      // Get today's active shift
      const today = new Date().toISOString().split("T")[0]
      const { data: shiftData } = await supabase
        .from("shifts")
        .select("*")
        .eq("status", "open")
        .gte("opened_at", today)
        .order("opened_at", { ascending: false })
        .limit(1)
        .single()
      setActiveShift(shiftData)

      // Get recent stock counts (last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const { data: countsData } = await supabase
        .from("stock_counts")
        .select("*, counter:counted_by(name)")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20)
      setRecentCounts(countsData || [])

      // Get pending approvals (for admin/manager)
      const { data: pendingData } = await supabase
        .from("stock_counts")
        .select("*, counter:counted_by(name)")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
      setPendingApprovals(pendingData || [])
    } catch (error) {
      console.error("Error loading stock count data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draf</Badge>
      case "submitted":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            Menunggu
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            Diluluskan
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  function getTypeBadge(type: string) {
    return type === "opening" ? (
      <Badge className="bg-blue-500">Pembukaan</Badge>
    ) : (
      <Badge className="bg-purple-500">Penutupan</Badge>
    )
  }

  const hasOpeningToday = recentCounts.some(
    (c) =>
      c.type === "opening" &&
      c.status !== "draft" &&
      new Date(c.created_at).toDateString() === new Date().toDateString(),
  )

  const hasClosingToday = recentCounts.some(
    (c) =>
      c.type === "closing" &&
      c.status !== "draft" &&
      new Date(c.created_at).toDateString() === new Date().toDateString(),
  )

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Stock Count</h1>
          <p className="text-muted-foreground">Kiraan stok pembukaan dan penutupan untuk audit dan rekonsiliasi</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={hasOpeningToday ? "border-green-200 bg-green-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Kiraan Pembukaan
              </CardTitle>
              <CardDescription>Kira stok sebelum buka kedai</CardDescription>
            </CardHeader>
            <CardContent>
              {hasOpeningToday ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Sudah selesai hari ini</span>
                </div>
              ) : (
                <Button onClick={() => router.push("/stock-count/new?type=opening")} className="w-full">
                  Mula Kiraan Pembukaan
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className={hasClosingToday ? "border-green-200 bg-green-50" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-purple-500" />
                Kiraan Penutupan
              </CardTitle>
              <CardDescription>Kira stok selepas tutup kedai</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasOpeningToday ? (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Sila buat kiraan pembukaan dahulu</span>
                </div>
              ) : hasClosingToday ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Sudah selesai hari ini</span>
                </div>
              ) : (
                <Button
                  onClick={() => router.push("/stock-count/new?type=closing")}
                  variant="secondary"
                  className="w-full"
                >
                  Mula Kiraan Penutupan
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Shift Status */}
        {activeShift && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Shift Aktif</p>
                    <p className="text-sm text-muted-foreground">
                      Dibuka {format(new Date(activeShift.opened_at), "HH:mm, d MMM yyyy", { locale: ms })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-blue-500 text-blue-600">
                  Berjalan
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Approvals (Admin only) */}
        {currentUser?.role === "admin" && pendingApprovals.length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Menunggu Kelulusan ({pendingApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingApprovals.map((count) => (
                <div
                  key={count.id}
                  onClick={() => router.push(`/stock-count/${count.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getTypeBadge(count.type)}
                    <div>
                      <p className="text-sm font-medium">{(count as any).counter?.name || "Staff"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(count.created_at), "HH:mm, d MMM", { locale: ms })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${count.variance_percentage > 2 ? "text-red-500" : "text-green-500"}`}
                    >
                      {count.variance_percentage.toFixed(1)}% variance
                    </p>
                    <p className="text-xs text-muted-foreground">
                      BND {Math.abs(count.total_variance_value).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Counts */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="opening">Pembukaan</TabsTrigger>
            <TabsTrigger value="closing">Penutupan</TabsTrigger>
          </TabsList>

          {["all", "opening", "closing"].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-2 mt-4">
              {recentCounts
                .filter((c) => tab === "all" || c.type === tab)
                .map((count) => (
                  <div
                    key={count.id}
                    onClick={() => router.push(`/stock-count/${count.id}`)}
                    className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {getTypeBadge(count.type)}
                      <div>
                        <p className="text-sm font-medium">{(count as any).counter?.name || "Staff"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(count.created_at), "HH:mm, d MMM yyyy", { locale: ms })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {count.status !== "draft" && (
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${
                              count.variance_percentage > 2 ? "text-red-500" : "text-green-500"
                            }`}
                          >
                            {count.variance_percentage.toFixed(1)}% variance
                          </p>
                          <p className="text-xs text-muted-foreground">
                            BND {Math.abs(count.total_variance_value).toFixed(2)}
                          </p>
                        </div>
                      )}
                      {getStatusBadge(count.status)}
                    </div>
                  </div>
                ))}
              {recentCounts.filter((c) => tab === "all" || c.type === tab).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Tiada rekod kiraan stok</div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppShell>
  )
}

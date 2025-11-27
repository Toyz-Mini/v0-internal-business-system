"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, CheckCircle, XCircle, Download, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ms } from "date-fns/locale"
import { toast } from "sonner"
import type { StockCount, StockCountItem, User } from "@/lib/types"

export default function StockCountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [stockCount, setStockCount] = useState<StockCount | null>(null)
  const [items, setItems] = useState<StockCountItem[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

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

      // Get stock count
      const { data: countData, error } = await supabase
        .from("stock_counts")
        .select(`
          *,
          counter:counted_by(id, name, email),
          approver:approved_by(id, name)
        `)
        .eq("id", id)
        .single()

      if (error) throw error
      setStockCount(countData)

      // Get items
      const { data: itemsData } = await supabase
        .from("stock_count_items")
        .select(`
          *,
          ingredient:ingredient_id(id, name, unit, current_stock)
        `)
        .eq("stock_count_id", id)
        .order("ingredient(name)")

      setItems(itemsData || [])
    } catch (error) {
      console.error("Error loading stock count:", error)
      toast.error("Gagal memuatkan data kiraan stok")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApprove() {
    if (!stockCount || !currentUser) return

    setIsProcessing(true)
    try {
      // Update status to approved
      const { error: updateError } = await supabase
        .from("stock_counts")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: currentUser.id,
        })
        .eq("id", stockCount.id)

      if (updateError) throw updateError

      // If closing count, apply to inventory
      if (stockCount.type === "closing") {
        const { error: applyError } = await supabase.rpc("apply_closing_count_to_inventory", {
          p_stock_count_id: stockCount.id,
        })
        if (applyError) {
          console.warn("Could not apply inventory adjustment:", applyError)
        }
      }

      toast.success("Kiraan stok diluluskan")
      router.push("/stock-count")
    } catch (error) {
      console.error("Error approving:", error)
      toast.error("Gagal meluluskan kiraan")
    } finally {
      setIsProcessing(false)
      setShowApproveDialog(false)
    }
  }

  async function handleReject() {
    if (!stockCount || !currentUser || !rejectReason.trim()) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from("stock_counts")
        .update({
          status: "rejected",
          rejection_reason: rejectReason.trim(),
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", stockCount.id)

      if (error) throw error

      toast.success("Kiraan stok ditolak")
      router.push("/stock-count")
    } catch (error) {
      console.error("Error rejecting:", error)
      toast.error("Gagal menolak kiraan")
    } finally {
      setIsProcessing(false)
      setShowRejectDialog(false)
    }
  }

  function exportCSV() {
    if (!stockCount || items.length === 0) return

    const headers = ["Bahan", "Unit", "Dijangka", "Dikira", "Varians (Unit)", "Kos/Unit", "Varians (RM)"]
    const rows = items.map((item) => [
      item.ingredient?.name || "",
      item.unit,
      item.expected_quantity?.toFixed(2) || "0",
      item.quantity_counted?.toFixed(2) || "-",
      item.variance_qty?.toFixed(2) || "0",
      item.unit_cost?.toFixed(2) || "0",
      item.variance_value?.toFixed(2) || "0",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stock-count-${stockCount.type}-${format(new Date(stockCount.created_at), "yyyyMMdd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draf</Badge>
      case "submitted":
        return <Badge className="bg-yellow-500">Menunggu Kelulusan</Badge>
      case "approved":
        return <Badge className="bg-green-500">Diluluskan</Badge>
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  if (!stockCount) {
    return (
      <AppShell>
        <div className="p-6 text-center">
          <p>Kiraan stok tidak dijumpai</p>
          <Button onClick={() => router.push("/stock-count")} className="mt-4">
            Kembali
          </Button>
        </div>
      </AppShell>
    )
  }

  const canApprove = currentUser?.role === "admin" && stockCount.status === "submitted"

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/stock-count")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">
                  Kiraan {stockCount.type === "opening" ? "Pembukaan" : "Penutupan"}
                </h1>
                {getStatusBadge(stockCount.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(stockCount.created_at), "HH:mm, d MMMM yyyy", { locale: ms })}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Dikira oleh</p>
                <p className="font-medium">{(stockCount as any).counter?.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Item Dikira</p>
                <p className="font-medium">
                  {items.filter((i) => !i.not_counted).length} / {items.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jumlah Varians</p>
                <p className={`font-medium ${stockCount.total_variance_value < 0 ? "text-red-500" : "text-green-500"}`}>
                  BND {stockCount.total_variance_value?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Peratusan Varians</p>
                <p className={`font-medium ${stockCount.variance_percentage > 2 ? "text-red-500" : "text-green-500"}`}>
                  {stockCount.variance_percentage?.toFixed(1) || "0.0"}%
                </p>
              </div>
            </div>

            {stockCount.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Nota</p>
                <p className="text-sm">{stockCount.notes}</p>
              </div>
            )}

            {stockCount.status === "rejected" && stockCount.rejection_reason && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-800">
                <p className="text-sm font-medium">Sebab Penolakan:</p>
                <p className="text-sm">{stockCount.rejection_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Senarai Item</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className={`p-4 ${item.not_counted ? "opacity-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.ingredient?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.unit} • BND {item.unit_cost?.toFixed(2)}/unit
                      </p>
                    </div>
                    {item.not_counted ? (
                      <Badge variant="secondary">Dilangkau</Badge>
                    ) : (
                      <div className="text-right">
                        <p className="font-mono">
                          {item.quantity_counted?.toFixed(2) || "-"} / {item.expected_quantity?.toFixed(2)}
                        </p>
                        <p
                          className={`text-sm ${item.variance_qty < 0 ? "text-red-500" : item.variance_qty > 0 ? "text-green-500" : "text-muted-foreground"}`}
                        >
                          {item.variance_qty >= 0 ? "+" : ""}
                          {item.variance_qty?.toFixed(2)} (BND {item.variance_value?.toFixed(2)})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin Approval Actions */}
        {canApprove && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
              onClick={() => setShowRejectDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Tolak
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setShowApproveDialog(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Luluskan
            </Button>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Luluskan Kiraan Stok</DialogTitle>
            <DialogDescription>
              {stockCount.type === "closing"
                ? "Meluluskan kiraan ini akan mengemas kini stok inventori mengikut nilai yang dikira."
                : "Meluluskan kiraan ini akan membenarkan POS dibuka untuk hari ini."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing} className="bg-green-600">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Luluskan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Kiraan Stok</DialogTitle>
            <DialogDescription>Sila berikan sebab penolakan supaya staff boleh membetulkan kiraan.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Sebab penolakan..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing || !rejectReason.trim()}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

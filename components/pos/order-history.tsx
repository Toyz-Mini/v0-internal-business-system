"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  History,
  Search,
  Receipt,
  XCircle,
  RotateCcw,
  Clock,
  Printer,
  ChevronRight,
  Banknote,
  QrCode,
  Building2,
  AlertTriangle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Order } from "@/lib/types"

interface OrderHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  userRole: string
  voidWindowMinutes?: number
}

export function OrderHistory({ open, onOpenChange, userId, userRole, voidWindowMinutes = 10 }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const [refundAmount, setRefundAmount] = useState("")
  const [processing, setProcessing] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  useEffect(() => {
    if (open) {
      fetchOrders()
    }
  }, [open])

  const fetchOrders = async () => {
    setLoading(true)
    const supabase = createClient()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(*),
        cashier:users(*),
        items:order_items(*)
      `)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(100)

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const canVoidOrder = (order: Order) => {
    if (order.payment_status !== "paid") return false
    if (userRole !== "admin" && userRole !== "cashier") return false

    const orderTime = new Date(order.created_at).getTime()
    const now = Date.now()
    const windowMs = voidWindowMinutes * 60 * 1000

    // Admin can void anytime, cashier only within window
    if (userRole === "admin") return true
    return now - orderTime <= windowMs
  }

  const canRefundOrder = (order: Order) => {
    if (order.payment_status !== "paid") return false
    return userRole === "admin"
  }

  const handleVoidOrder = async () => {
    if (!selectedOrder || !voidReason.trim()) return

    setProcessing(true)
    const supabase = createClient()

    try {
      // Update order status
      await supabase
        .from("orders")
        .update({
          payment_status: "voided",
          voided_at: new Date().toISOString(),
          voided_by: userId,
          void_reason: voidReason,
        })
        .eq("id", selectedOrder.id)

      // Restore stock
      if (selectedOrder.items) {
        for (const item of selectedOrder.items) {
          if (!item.product_id) continue

          const { data: recipes } = await supabase
            .from("recipes")
            .select("*, ingredient:ingredients(*)")
            .eq("product_id", item.product_id)

          if (recipes) {
            for (const recipe of recipes) {
              const restoreQty = recipe.qty_per_unit * item.quantity
              const newStock = recipe.ingredient.current_stock + restoreQty

              await supabase
                .from("ingredients")
                .update({
                  current_stock: newStock,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", recipe.ingredient_id)

              await supabase.from("stock_logs").insert({
                ingredient_id: recipe.ingredient_id,
                type: "in",
                quantity: restoreQty,
                previous_stock: recipe.ingredient.current_stock,
                new_stock: newStock,
                reference_type: "void",
                reference_id: selectedOrder.id,
                notes: `Void Order ${selectedOrder.order_number}: ${voidReason}`,
                created_by: userId,
              })
            }
          }
        }
      }

      await fetchOrders()
      setShowVoidDialog(false)
      setSelectedOrder(null)
      setVoidReason("")
    } catch (error) {
      console.error("Void error:", error)
      alert("Gagal void order")
    } finally {
      setProcessing(false)
    }
  }

  const handleRefundOrder = async () => {
    if (!selectedOrder) return

    const amount = Number.parseFloat(refundAmount) || selectedOrder.total
    if (amount <= 0 || amount > selectedOrder.total) {
      alert("Jumlah refund tidak sah")
      return
    }

    setProcessing(true)
    const supabase = createClient()

    try {
      const isFullRefund = amount === selectedOrder.total

      await supabase
        .from("orders")
        .update({
          payment_status: isFullRefund ? "refunded" : "paid",
          refunded_at: new Date().toISOString(),
          refunded_by: userId,
          refund_amount: (selectedOrder.refund_amount || 0) + amount,
        })
        .eq("id", selectedOrder.id)

      // Restore stock for full refund
      if (isFullRefund && selectedOrder.items) {
        for (const item of selectedOrder.items) {
          if (!item.product_id) continue

          const { data: recipes } = await supabase
            .from("recipes")
            .select("*, ingredient:ingredients(*)")
            .eq("product_id", item.product_id)

          if (recipes) {
            for (const recipe of recipes) {
              const restoreQty = recipe.qty_per_unit * item.quantity
              const newStock = recipe.ingredient.current_stock + restoreQty

              await supabase
                .from("ingredients")
                .update({
                  current_stock: newStock,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", recipe.ingredient_id)

              await supabase.from("stock_logs").insert({
                ingredient_id: recipe.ingredient_id,
                type: "in",
                quantity: restoreQty,
                previous_stock: recipe.ingredient.current_stock,
                new_stock: newStock,
                reference_type: "refund",
                reference_id: selectedOrder.id,
                notes: `Refund Order ${selectedOrder.order_number}`,
                created_by: userId,
              })
            }
          }
        }
      }

      await fetchOrders()
      setShowRefundDialog(false)
      setSelectedOrder(null)
      setRefundAmount("")
    } catch (error) {
      console.error("Refund error:", error)
      alert("Gagal refund order")
    } finally {
      setProcessing(false)
    }
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const paidOrders = filteredOrders.filter((o) => o.payment_status === "paid")
  const voidedOrders = filteredOrders.filter((o) => o.payment_status === "voided" || o.payment_status === "refunded")

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />
      case "qrpay":
        return <QrCode className="h-4 w-4" />
      case "bank_transfer":
        return <Building2 className="h-4 w-4" />
      default:
        return <Banknote className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Selesai</Badge>
      case "voided":
        return <Badge variant="destructive">Void</Badge>
      case "refunded":
        return <Badge className="bg-orange-500">Refund</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Sejarah Order Hari Ini
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari order number atau nama customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs defaultValue="paid" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paid">Selesai ({paidOrders.length})</TabsTrigger>
              <TabsTrigger value="voided">Void/Refund ({voidedOrders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="paid" className="flex-1 min-h-0">
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : paidOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Tiada order hari ini</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paidOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{order.order_number}</span>
                            {getStatusBadge(order.payment_status)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(order.created_at).toLocaleTimeString("ms-MY", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              {getPaymentIcon(order.payment_method)}
                              {order.payment_method === "cash"
                                ? "Tunai"
                                : order.payment_method === "qrpay"
                                  ? "QR Pay"
                                  : "Transfer"}
                            </span>
                            {order.customer && <span>{order.customer.name}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">BND {order.total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{order.items?.length || 0} item</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="voided" className="flex-1 min-h-0">
              <ScrollArea className="h-[400px]">
                {voidedOrders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Tiada order void/refund</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {voidedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{order.order_number}</span>
                            {getStatusBadge(order.payment_status)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(order.created_at).toLocaleTimeString("ms-MY", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {order.void_reason && <span className="text-destructive">{order.void_reason}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg line-through text-muted-foreground">
                            BND {order.total.toFixed(2)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder && !showVoidDialog && !showRefundDialog && !showReceipt}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedOrder?.order_number}</span>
              {selectedOrder && getStatusBadge(selectedOrder.payment_status)}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Masa: {new Date(selectedOrder.created_at).toLocaleString("ms-MY")}</p>
                {selectedOrder.customer && <p>Pelanggan: {selectedOrder.customer.name}</p>}
                {selectedOrder.cashier && <p>Cashier: {selectedOrder.cashier.name}</p>}
              </div>

              {/* Items */}
              <div className="border rounded-lg divide-y">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x BND {item.unit_price.toFixed(2)}
                      </p>
                      {item.modifiers?.length > 0 && (
                        <p className="text-xs text-muted-foreground">{item.modifiers.map((m) => m.name).join(", ")}</p>
                      )}
                    </div>
                    <p className="font-medium">BND {item.subtotal.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>BND {selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Diskaun</span>
                    <span>-BND {selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Jumlah</span>
                  <span>BND {selectedOrder.total.toFixed(2)}</span>
                </div>
                {selectedOrder.refund_amount && selectedOrder.refund_amount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Refund</span>
                    <span>-BND {selectedOrder.refund_amount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Void Reason */}
              {selectedOrder.void_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive">Sebab Void:</p>
                  <p className="text-sm">{selectedOrder.void_reason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowReceipt(true)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Cetak
                </Button>

                {canVoidOrder(selectedOrder) && (
                  <Button variant="destructive" className="flex-1" onClick={() => setShowVoidDialog(true)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Void
                  </Button>
                )}

                {canRefundOrder(selectedOrder) && (
                  <Button
                    variant="outline"
                    className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-50 bg-transparent"
                    onClick={() => {
                      setRefundAmount(selectedOrder.total.toString())
                      setShowRefundDialog(true)
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refund
                  </Button>
                )}
              </div>

              {/* Void Window Warning */}
              {selectedOrder.payment_status === "paid" && userRole === "cashier" && !canVoidOrder(selectedOrder) && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Void window ({voidWindowMinutes} minit) telah tamat. Hubungi admin untuk void.</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Void Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Order <strong>{selectedOrder?.order_number}</strong> akan di-void dan stok akan dipulihkan.
            </p>

            <div className="space-y-2">
              <Label>Sebab Void *</Label>
              <Textarea
                placeholder="Masukkan sebab void..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                setShowVoidDialog(false)
                setVoidReason("")
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleVoidOrder}
              disabled={processing || !voidReason.trim()}
            >
              {processing ? "Memproses..." : "Void Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <RotateCcw className="h-5 w-5" />
              Refund Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Order <strong>{selectedOrder?.order_number}</strong>
            </p>

            <div className="space-y-2">
              <Label>Jumlah Refund (Max: BND {selectedOrder?.total.toFixed(2)})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRefundAmount(selectedOrder?.total.toString() || "")}
                >
                  Full Refund
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRefundAmount((selectedOrder?.total ? selectedOrder.total / 2 : 0).toFixed(2))}
                >
                  50%
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                setShowRefundDialog(false)
                setRefundAmount("")
              }}
            >
              Batal
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={handleRefundOrder}
              disabled={processing}
            >
              {processing ? "Memproses..." : "Refund"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm">
          <div id="receipt-content" className="bg-white text-black p-6 font-mono text-sm">
            {/* Receipt Header */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold">ABANGBOB</h2>
              <p className="text-xs">Ayam Gunting</p>
              <p className="text-xs">Tel: 012-3456789</p>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Order Info */}
            <div className="text-xs space-y-1 mb-3">
              <div className="flex justify-between">
                <span>No:</span>
                <span>{selectedOrder?.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Tarikh:</span>
                <span>{new Date(selectedOrder?.created_at || "").toLocaleDateString("ms-MY")}</span>
              </div>
              <div className="flex justify-between">
                <span>Masa:</span>
                <span>{new Date(selectedOrder?.created_at || "").toLocaleTimeString("ms-MY")}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Items */}
            <div className="space-y-2 mb-3">
              {selectedOrder?.items?.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between">
                    <span>{item.product_name}</span>
                    <span>BND {item.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-600 pl-2">
                    {item.quantity} x BND {item.unit_price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>BND {selectedOrder?.subtotal.toFixed(2)}</span>
              </div>
              {selectedOrder?.discount_amount && selectedOrder.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>Diskaun:</span>
                  <span>-BND {selectedOrder.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>JUMLAH:</span>
                <span>BND {selectedOrder?.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Footer */}
            <div className="text-center text-xs mt-4">
              <p>Terima Kasih!</p>
              <p>Sila datang lagi</p>
            </div>
          </div>

          <Button onClick={() => window.print()} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Cetak Resit
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Package, Plus, Trash2, Truck, CheckCircle, Clock, XCircle, FileText, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Supplier, Ingredient, PurchaseOrder } from "@/lib/types"

interface PurchaseOrdersDialogProps {
  suppliers: Supplier[]
  ingredients: Ingredient[]
  userId?: string
}

export function PurchaseOrdersDialog({ suppliers, ingredients, userId }: PurchaseOrdersDialogProps) {
  const [open, setOpen] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [processing, setProcessing] = useState(false)

  // Create PO form state
  const [supplierId, setSupplierId] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<{ ingredient_id: string; quantity: number; unit_cost: number }[]>([])

  useEffect(() => {
    if (open) {
      fetchPurchaseOrders()
    }
  }, [open])

  const fetchPurchaseOrders = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(*, ingredient:ingredients(*))
      `)
      .order("created_at", { ascending: false })
      .limit(50)

    if (!error && data) {
      setPurchaseOrders(data)
    }
    setLoading(false)
  }

  const addItem = () => {
    setItems([...items, { ingredient_id: "", quantity: 0, unit_cost: 0 }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-fill unit cost from ingredient
    if (field === "ingredient_id") {
      const ing = ingredients.find((i) => i.id === value)
      if (ing) {
        updated[index].unit_cost = ing.cost_per_unit
      }
    }

    setItems(updated)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
  }

  const handleCreatePO = async () => {
    if (!supplierId || items.length === 0 || items.some((i) => !i.ingredient_id)) {
      alert("Sila pilih supplier dan sekurang-kurangnya satu ingredient")
      return
    }

    setProcessing(true)
    const supabase = createClient()

    try {
      // Generate PO number
      const { data: poNumber } = await supabase.rpc("generate_po_number")

      // Create PO
      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: poNumber || `PO-${Date.now()}`,
          supplier_id: supplierId,
          status: "pending",
          total_amount: calculateTotal(),
          notes,
          expected_date: expectedDate || null,
          created_by: userId,
        })
        .select()
        .single()

      if (poError) throw poError

      // Create PO items
      const poItems = items.map((item) => ({
        purchase_order_id: po.id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }))

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(poItems)
      if (itemsError) throw itemsError

      await fetchPurchaseOrders()
      resetForm()
      setShowCreate(false)
    } catch (error) {
      console.error("Error creating PO:", error)
      alert("Gagal membuat Purchase Order")
    } finally {
      setProcessing(false)
    }
  }

  const handleReceivePO = async (po: PurchaseOrder) => {
    if (!po.items || po.items.length === 0) return

    setProcessing(true)
    const supabase = createClient()

    try {
      // Update ingredient stocks
      for (const item of po.items) {
        if (!item.ingredient) continue

        const newStock = item.ingredient.current_stock + item.quantity

        // Update stock
        await supabase
          .from("ingredients")
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.ingredient_id)

        // Create stock log
        await supabase.from("stock_logs").insert({
          ingredient_id: item.ingredient_id,
          type: "in",
          quantity: item.quantity,
          previous_stock: item.ingredient.current_stock,
          new_stock: newStock,
          reference_type: "purchase",
          reference_id: po.id,
          notes: `PO ${po.po_number}`,
          created_by: userId,
        })

        // Update received quantity
        await supabase.from("purchase_order_items").update({ received_quantity: item.quantity }).eq("id", item.id)
      }

      // Update PO status
      await supabase
        .from("purchase_orders")
        .update({
          status: "received",
          received_date: new Date().toISOString(),
          received_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", po.id)

      await fetchPurchaseOrders()
      setSelectedPO(null)
    } catch (error) {
      console.error("Error receiving PO:", error)
      alert("Gagal menerima stock")
    } finally {
      setProcessing(false)
    }
  }

  const handleCancelPO = async (po: PurchaseOrder) => {
    if (!confirm("Adakah anda pasti mahu batalkan PO ini?")) return

    setProcessing(true)
    const supabase = createClient()

    try {
      await supabase
        .from("purchase_orders")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", po.id)

      await fetchPurchaseOrders()
      setSelectedPO(null)
    } catch (error) {
      console.error("Error cancelling PO:", error)
      alert("Gagal membatalkan PO")
    } finally {
      setProcessing(false)
    }
  }

  const resetForm = () => {
    setSupplierId("")
    setExpectedDate("")
    setNotes("")
    setItems([])
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
      case "received":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Received
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const pendingPOs = purchaseOrders.filter((po) => po.status === "pending" || po.status === "draft")
  const completedPOs = purchaseOrders.filter((po) => po.status === "received" || po.status === "cancelled")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Truck className="mr-2 h-4 w-4" />
          Purchase Orders
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Orders
            </span>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Buat PO Baru
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pending" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending ({pendingPOs.length})</TabsTrigger>
            <TabsTrigger value="completed">Selesai ({completedPOs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="flex-1 min-h-0">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : pendingPOs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tiada PO pending</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingPOs.map((po) => (
                    <Card
                      key={po.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedPO(po)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{po.po_number}</span>
                            {getStatusBadge(po.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {po.supplier?.name || "No Supplier"} • {po.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">BND {po.total_amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(po.created_at).toLocaleDateString("ms-MY")}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed" className="flex-1 min-h-0">
            <ScrollArea className="h-[400px]">
              {completedPOs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tiada PO selesai</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {completedPOs.map((po) => (
                    <Card
                      key={po.id}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedPO(po)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold">{po.po_number}</span>
                            {getStatusBadge(po.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {po.supplier?.name || "No Supplier"} • {po.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">BND {po.total_amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(po.created_at).toLocaleDateString("ms-MY")}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Create PO Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Purchase Order Baru</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tarikh Jangkaan</Label>
                <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Item
                </Button>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={item.ingredient_id} onValueChange={(v) => updateItem(index, "ingredient_id", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing) => (
                            <SelectItem key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Qty (optional)"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(index, "quantity", e.target.value ? Number(e.target.value) : 0)}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="Harga (optional)"
                        value={item.unit_cost || ""}
                        onChange={(e) => updateItem(index, "unit_cost", e.target.value ? Number(e.target.value) : 0)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {items.length > 0 && (
                <div className="text-right text-sm font-medium pt-2 border-t">
                  Jumlah: BND {calculateTotal().toFixed(2)}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nota</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota tambahan..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowCreate(false)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={handleCreatePO} disabled={processing}>
              {processing ? "Menyimpan..." : "Buat PO"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PO Detail Dialog */}
      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedPO?.po_number}</span>
              {selectedPO && getStatusBadge(selectedPO.status)}
            </DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>Supplier: {selectedPO.supplier?.name || "-"}</p>
                <p>Tarikh: {new Date(selectedPO.created_at).toLocaleDateString("ms-MY")}</p>
                {selectedPO.expected_date && (
                  <p>Jangkaan: {new Date(selectedPO.expected_date).toLocaleDateString("ms-MY")}</p>
                )}
              </div>

              <div className="border rounded-lg divide-y">
                {selectedPO.items?.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between">
                    <div>
                      <p className="font-medium">{item.ingredient?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.ingredient?.unit} @ BND {item.unit_cost.toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium">BND {(item.quantity * item.unit_cost).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Jumlah</span>
                <span>BND {selectedPO.total_amount.toFixed(2)}</span>
              </div>

              {selectedPO.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedPO.notes}</p>
                </div>
              )}

              {selectedPO.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleCancelPO(selectedPO)}
                    disabled={processing}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Batal
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleReceivePO(selectedPO)}
                    disabled={processing}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Terima Stock
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

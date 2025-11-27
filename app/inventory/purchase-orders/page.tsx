"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Eye, Truck, Check, X, Package } from "lucide-react"

interface Supplier {
  id: string
  name: string
}

interface Ingredient {
  id: string
  name: string
  unit: string
}

interface PurchaseOrderItem {
  id: string
  ingredient_id: string
  ingredient?: Ingredient
  quantity: number | null
  unit_cost: number | null
  received_quantity: number | null
}

interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  supplier?: Supplier
  status: string
  expected_date: string | null
  notes: string | null
  total_amount: number | null
  created_at: string
  items?: PurchaseOrderItem[]
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Create form state
  const [formData, setFormData] = useState({
    supplier_id: "",
    expected_date: "",
    notes: "",
  })
  const [poItems, setPoItems] = useState<{ ingredient_id: string; quantity: string; unit_cost: string }[]>([
    { ingredient_id: "", quantity: "", unit_cost: "" },
  ])

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [posRes, suppliersRes, ingredientsRes] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select("*, supplier:suppliers(*), items:purchase_order_items(*, ingredient:ingredients(*))")
        .order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, name").order("name"),
      supabase.from("ingredients").select("id, name, unit").order("name"),
    ])

    setPurchaseOrders(posRes.data || [])
    setSuppliers(suppliersRes.data || [])
    setIngredients(ingredientsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const addItem = () => {
    setPoItems([...poItems, { ingredient_id: "", quantity: "", unit_cost: "" }])
  }

  const removeItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...poItems]
    updated[index] = { ...updated[index], [field]: value }
    setPoItems(updated)
  }

  const handleCreate = async () => {
    if (!formData.supplier_id) {
      toast({ title: "Error", description: "Sila pilih supplier", variant: "destructive" })
      return
    }

    const validItems = poItems.filter((item) => item.ingredient_id)
    if (validItems.length === 0) {
      toast({ title: "Error", description: "Sila tambah sekurang-kurangnya satu item", variant: "destructive" })
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`

      const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
          po_number: poNumber,
          supplier_id: formData.supplier_id,
          expected_date: formData.expected_date || null,
          notes: formData.notes || null,
          status: "pending",
        })
        .select()
        .single()

      if (poError) throw poError

      const itemsToInsert = validItems.map((item) => ({
        purchase_order_id: po.id,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity ? Number.parseFloat(item.quantity) : null,
        unit_cost: item.unit_cost ? Number.parseFloat(item.unit_cost) : null,
      }))

      const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast({ title: "Berjaya", description: "Purchase Order berjaya dibuat" })
      setCreateDialogOpen(false)
      setFormData({ supplier_id: "", expected_date: "", notes: "" })
      setPoItems([{ ingredient_id: "", quantity: "", unit_cost: "" }])
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (poId: string, newStatus: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", poId)

      if (error) throw error

      toast({ title: "Berjaya", description: `Status dikemaskini ke ${newStatus}` })
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "ordered":
        return <Badge variant="secondary">Ordered</Badge>
      case "received":
        return <Badge className="bg-green-500">Received</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Purchase Orders</h1>
            <p className="text-muted-foreground">Urus pesanan pembelian bahan</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Buat PO Baru
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Senarai PO ({filteredPOs.length})
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari PO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Memuatkan...</div>
            ) : filteredPOs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Tiada Purchase Order</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Tarikh Jangkaan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tarikh Dibuat</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                      <TableCell>{po.supplier?.name || "-"}</TableCell>
                      <TableCell>{po.items?.length || 0} items</TableCell>
                      <TableCell>{formatDate(po.expected_date)}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>{formatDate(po.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPO(po)
                              setViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {po.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStatus(po.id, "ordered")}
                                title="Mark as Ordered"
                              >
                                <Truck className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStatus(po.id, "cancelled")}
                                title="Cancel"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {po.status === "ordered" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatus(po.id, "received")}
                              title="Mark as Received"
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Purchase Order Baru</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tarikh Jangkaan</Label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah Item
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {poItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Select value={item.ingredient_id} onValueChange={(v) => updateItem(index, "ingredient_id", v)}>
                      <SelectTrigger className="flex-1">
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
                    <Input
                      type="number"
                      placeholder="Qty (optional)"
                      className="w-28"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Harga (optional)"
                      className="w-28"
                      value={item.unit_cost}
                      onChange={(e) => updateItem(index, "unit_cost", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={poItems.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nota</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Nota tambahan..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Menyimpan..." : "Buat PO"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail PO: {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedPO.supplier?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPO.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tarikh Jangkaan</p>
                  <p>{formatDate(selectedPO.expected_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tarikh Dibuat</p>
                  <p>{formatDate(selectedPO.created_at)}</p>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Nota</p>
                  <p>{selectedPO.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.ingredient?.name || "-"}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity ? `${item.quantity} ${item.ingredient?.unit || ""}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unit_cost ? `BND ${item.unit_cost.toFixed(2)}` : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

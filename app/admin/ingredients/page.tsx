"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, History } from "lucide-react"
import type { Ingredient, Supplier, StockLog } from "@/lib/types"
import { INGREDIENT_UNITS } from "@/lib/types"

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [stockLogs, setStockLogs] = useState<StockLog[]>([])
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    unit: "kg",
    current_stock: "0",
    min_stock: "0",
    cost_per_unit: "0",
    supplier_id: "",
    is_active: true,
  })

  const [adjustData, setAdjustData] = useState({
    new_stock: "",
    notes: "",
  })

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [ingredientsRes, suppliersRes] = await Promise.all([
      supabase.from("ingredients").select("*").order("name"),
      supabase.from("suppliers").select("*").eq("is_active", true).order("name"),
    ])

    if (ingredientsRes.data) setIngredients(ingredientsRes.data)
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAddDialog = () => {
    setSelectedIngredient(null)
    setFormData({
      name: "",
      unit: "kg",
      current_stock: "0",
      min_stock: "0",
      cost_per_unit: "0",
      supplier_id: "",
      is_active: true,
    })
    setDialogOpen(true)
    setEditingItem(null)
  }

  const openEditDialog = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient)
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
      current_stock: ingredient.current_stock.toString(),
      min_stock: ingredient.min_stock.toString(),
      cost_per_unit: ingredient.cost_per_unit.toString(),
      supplier_id: ingredient.supplier_id || "",
      is_active: ingredient.is_active,
    })
    setDialogOpen(true)
    setEditingItem(ingredient)
  }

  const openAdjustDialog = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient)
    setAdjustData({
      new_stock: ingredient.current_stock.toString(),
      notes: "",
    })
    setAdjustDialogOpen(true)
  }

  const openHistoryDialog = async (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient)
    setHistoryDialogOpen(true)

    const supabase = createClient()
    const { data } = await supabase
      .from("stock_logs")
      .select("*")
      .eq("ingredient_id", ingredient.id)
      .order("created_at", { ascending: false })
      .limit(50)

    setStockLogs(data || [])
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Nama bahan wajib diisi", variant: "destructive" })
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (selectedIngredient) {
        const { error } = await supabase
          .from("ingredients")
          .update({
            name: formData.name,
            unit: formData.unit,
            current_stock: Number.parseFloat(formData.current_stock),
            min_stock: Number.parseFloat(formData.min_stock),
            cost_per_unit: Number.parseFloat(formData.cost_per_unit),
            supplier_id: formData.supplier_id || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedIngredient.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("ingredients").insert({
          name: formData.name,
          unit: formData.unit,
          current_stock: Number.parseFloat(formData.current_stock),
          min_stock: Number.parseFloat(formData.min_stock),
          cost_per_unit: Number.parseFloat(formData.cost_per_unit),
          supplier_id: formData.supplier_id || null,
          is_active: formData.is_active,
        })

        if (error) throw error
      }

      toast({ title: "Berjaya", description: selectedIngredient ? "Bahan dikemaskini" : "Bahan ditambah" })
      setDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleAdjust = async () => {
    if (!selectedIngredient) return

    const newStock = Number.parseFloat(adjustData.new_stock)
    if (isNaN(newStock) || newStock < 0) {
      toast({ title: "Error", description: "Stok tidak sah", variant: "destructive" })
      return
    }

    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    try {
      // Update stock
      const { error: updateError } = await supabase
        .from("ingredients")
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedIngredient.id)

      if (updateError) throw updateError

      // Create stock log
      const { error: logError } = await supabase.from("stock_logs").insert({
        ingredient_id: selectedIngredient.id,
        type: "adjustment",
        quantity: newStock - selectedIngredient.current_stock,
        previous_stock: selectedIngredient.current_stock,
        new_stock: newStock,
        notes: adjustData.notes || "Stock adjustment",
        created_by: user?.id,
      })

      if (logError) throw logError

      toast({ title: "Berjaya", description: "Stok dikemaskini" })
      setAdjustDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedIngredient) return

    const supabase = createClient()
    try {
      // Check if ingredient is used in recipes
      const { data: recipes } = await supabase
        .from("recipes")
        .select("id")
        .eq("ingredient_id", selectedIngredient.id)
        .limit(1)

      if (recipes && recipes.length > 0) {
        toast({
          title: "Error",
          description: "Tidak boleh padam bahan yang digunakan dalam resepi",
          variant: "destructive",
        })
        setDeleteDialogOpen(false)
        return
      }

      const { error } = await supabase.from("ingredients").delete().eq("id", selectedIngredient.id)

      if (error) throw error

      toast({ title: "Berjaya", description: "Bahan dipadam" })
      setDeleteDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const filteredIngredients = ingredients.filter((ing) => ing.name.toLowerCase().includes(search.toLowerCase()))

  const lowStockCount = ingredients.filter((i) => i.current_stock <= i.min_stock).length

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bahan Mentah</h1>
            <p className="text-muted-foreground">Urus inventori bahan mentah</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Bahan
          </Button>
        </div>

        {lowStockCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <p className="text-sm text-orange-800">
                <strong>{lowStockCount}</strong> bahan mempunyai stok rendah
              </p>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari bahan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingredients Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Senarai Bahan ({filteredIngredients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Memuatkan...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Bahan</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Stok Semasa</TableHead>
                    <TableHead className="text-right">Min Stok</TableHead>
                    <TableHead className="text-right">Kos/Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIngredients.map((ingredient) => {
                    const isLowStock = ingredient.current_stock <= ingredient.min_stock
                    return (
                      <TableRow key={ingredient.id} className={isLowStock ? "bg-orange-50" : ""}>
                        <TableCell className="font-medium">{ingredient.name}</TableCell>
                        <TableCell>{ingredient.unit}</TableCell>
                        <TableCell className="text-right">
                          <span className={isLowStock ? "text-orange-600 font-medium" : ""}>
                            {ingredient.current_stock.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {ingredient.min_stock.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">BND {ingredient.cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive">Stok Rendah</Badge>
                          ) : (
                            <Badge variant={ingredient.is_active ? "default" : "secondary"}>
                              {ingredient.is_active ? "Aktif" : "Tidak Aktif"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openAdjustDialog(ingredient)}
                              title="Adjust Stok"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openHistoryDialog(ingredient)}
                              title="Sejarah Stok"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(ingredient)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedIngredient(ingredient)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Bahan" : "Tambah Bahan Baru"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Kemaskini maklumat bahan." : "Isi maklumat bahan untuk tambah ke sistem."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Bahan *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="cth: Ayam"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit Ukuran</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INGREDIENT_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label} ({unit.fullLabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Kos per Unit (BND)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current_stock">Stok Semasa</Label>
                <Input
                  id="current_stock"
                  type="number"
                  step="0.01"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Min Stok (Alert)</Label>
                <Input
                  id="min_stock"
                  type="number"
                  step="0.01"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Pembekal</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pembekal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Bahan Aktif</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stok - {selectedIngredient?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm">
                <strong>Stok Semasa:</strong> {selectedIngredient?.current_stock} {selectedIngredient?.unit}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_stock">Stok Baru</Label>
              <Input
                id="new_stock"
                type="number"
                step="0.01"
                value={adjustData.new_stock}
                onChange={(e) => setAdjustData({ ...adjustData, new_stock: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Nota</Label>
              <Input
                id="notes"
                value={adjustData.notes}
                onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                placeholder="Sebab adjustment (cth: Stock take)"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAdjust} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sejarah Stok - {selectedIngredient?.name}</DialogTitle>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {stockLogs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Tiada rekod</p>
            ) : (
              <div className="space-y-2">
                {stockLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {log.type === "in" ? "Masuk" : log.type === "out" ? "Keluar" : "Adjustment"}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.notes}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("ms-MY")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${log.quantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {log.quantity >= 0 ? "+" : ""}
                        {log.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.previous_stock} → {log.new_stock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Bahan?</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti untuk memadam "{selectedIngredient?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}

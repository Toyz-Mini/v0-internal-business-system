"use client"

import type React from "react"
import { INGREDIENT_UNITS } from "@/lib/types"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Search, RefreshCw, PackageOpen } from "lucide-react"
import type { Ingredient, Supplier } from "@/lib/types"
import { toast } from "sonner"

interface InventoryTableProps {
  ingredients: (Ingredient & { supplier?: Supplier })[]
  suppliers: Supplier[]
  userRole?: string
}

export function InventoryTable({ ingredients, suppliers, userRole = "admin" }: InventoryTableProps) {
  const [search, setSearch] = useState("")
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [recomputingId, setRecomputingId] = useState<string | null>(null)

  const filteredIngredients = ingredients.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingItem) return

    setIsUpdating(true)
    const formData = new FormData(e.currentTarget)

    try {
      const supplierIdValue = formData.get("supplier_id")
      const response = await fetch(`/api/inventory/ingredients/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name") as string,
          unit: formData.get("unit") as string,
          min_stock: Number(formData.get("min_stock")),
          cost_per_unit: Number(formData.get("cost_per_unit")),
          supplier_id: supplierIdValue === "none" ? null : supplierIdValue,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update ingredient")
      }

      toast.success("Berjaya kemaskini ingredient")
      setEditingItem(null)
      window.location.reload()
    } catch (error: any) {
      console.error("Error updating ingredient:", error)
      toast.error(error.message || "Gagal kemaskini ingredient")
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleRecomputeSingle(ingredientId: string) {
    setRecomputingId(ingredientId)

    try {
      const response = await fetch("/api/inventory/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredientId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to recompute")
      }

      toast.success("Stock level recomputed")
      window.location.reload()
    } catch (error) {
      console.error("Recompute error:", error)
      toast.error("Failed to recompute stock level")
    } finally {
      setRecomputingId(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Avg Cost/Unit</TableHead>
              <TableHead>Manual Cost/Unit</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIngredients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <PackageOpen className="h-8 w-8" />
                    {ingredients.length === 0 ? (
                      <>
                        <p className="font-medium">No ingredients found</p>
                        <p className="text-sm">Add your first ingredient to get started</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">No matching ingredients</p>
                        <p className="text-sm">Try a different search term</p>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredIngredients.map((item) => {
                const isLow = item.current_stock <= item.min_stock
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.current_stock.toFixed(2)}</TableCell>
                    <TableCell>{item.min_stock.toFixed(2)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      {item.avg_cost_per_unit && item.avg_cost_per_unit > 0
                        ? `BND ${item.avg_cost_per_unit.toFixed(4)}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">BND {item.cost_per_unit.toFixed(2)}</TableCell>
                    <TableCell>{item.supplier?.name || "-"}</TableCell>
                    <TableCell>
                      {isLow ? <Badge variant="destructive">Low Stock</Badge> : <Badge variant="secondary">OK</Badge>}
                    </TableCell>
                    <TableCell>
                      {["admin", "manager"].includes(userRole) && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRecomputeSingle(item.id)}
                            disabled={recomputingId === item.id}
                            title="Recompute stock from logs"
                          >
                            <RefreshCw className={`h-4 w-4 ${recomputingId === item.id ? "animate-spin" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ingredient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={editingItem?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue={editingItem?.unit}>
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
                <Label htmlFor="min_stock">Min Stock</Label>
                <Input
                  id="min_stock"
                  name="min_stock"
                  type="number"
                  step="0.001"
                  defaultValue={editingItem?.min_stock}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_unit">Cost per Unit (BND)</Label>
              <Input
                id="cost_per_unit"
                name="cost_per_unit"
                type="number"
                step="0.01"
                defaultValue={editingItem?.cost_per_unit}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier</Label>
              <Select name="supplier_id" defaultValue={editingItem?.supplier_id || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setEditingItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

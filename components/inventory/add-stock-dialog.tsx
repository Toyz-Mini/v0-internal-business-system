"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Info } from "lucide-react"
import { toast } from "sonner"
import { INGREDIENT_UNITS } from "@/lib/types"

interface Supplier {
  id: string
  name: string
  contact_person: string
  is_active: boolean
}

interface Employee {
  id: string
  name: string
  is_active: boolean
}

export function AddStockDialog() {
  const [open, setOpen] = useState(false)
  const [ingredients, setIngredients] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    ingredient_id: "",
    supplier_id: "",
    received_by: "",
    quantity: "",
    unit_cost: "",
    total_cost: "",
    type: "in" as "in" | "out" | "adjustment",
    notes: "",
  })

  useEffect(() => {
    if (open) {
      fetchIngredients()
      fetchSuppliers()
      fetchEmployees()
    }
  }, [open])

  async function fetchIngredients() {
    try {
      const response = await fetch("/api/inventory/ingredients")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to load ingredients")
      }

      setIngredients(data)
    } catch (error: any) {
      console.error("[v0] Failed to fetch ingredients:", error)
      toast.error(error.message || "Gagal muatkan ingredients")
    }
  }

  async function fetchSuppliers() {
    try {
      const response = await fetch("/api/suppliers")
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.filter((s: any) => s.is_active))
      }
    } catch (error) {
      console.error("[v0] Failed to fetch suppliers:", error)
    }
  }

  async function fetchEmployees() {
    try {
      const response = await fetch("/api/employees")
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.filter((e: any) => e.is_active))
      }
    } catch (error) {
      console.error("[v0] Failed to fetch employees:", error)
    }
  }

  function handleTotalCostChange(value: string) {
    setFormData((prev) => {
      const newData = { ...prev, total_cost: value }
      const qty = Number.parseFloat(prev.quantity)
      const total = Number.parseFloat(value)
      if (qty > 0 && total > 0) {
        newData.unit_cost = (total / qty).toFixed(4)
      }
      return newData
    })
  }

  function handleUnitCostChange(value: string) {
    setFormData((prev) => {
      const newData = { ...prev, unit_cost: value }
      const qty = Number.parseFloat(prev.quantity)
      const unit = Number.parseFloat(value)
      if (qty > 0 && unit > 0) {
        newData.total_cost = (qty * unit).toFixed(2)
      }
      return newData
    })
  }

  function handleQuantityChange(value: string) {
    setFormData((prev) => {
      const newData = { ...prev, quantity: value }
      const qty = Number.parseFloat(value)

      if (qty > 0) {
        if (prev.total_cost) {
          const total = Number.parseFloat(prev.total_cost)
          newData.unit_cost = (total / qty).toFixed(4)
        } else if (prev.unit_cost) {
          const unit = Number.parseFloat(prev.unit_cost)
          newData.total_cost = (qty * unit).toFixed(2)
        }
      }

      return newData
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const quantity = Number.parseFloat(formData.quantity)
      const unitCost = formData.unit_cost ? Number.parseFloat(formData.unit_cost) : undefined
      const totalCost = formData.total_cost ? Number.parseFloat(formData.total_cost) : undefined

      if (!formData.ingredient_id) {
        toast.error("Sila pilih ingredient")
        setLoading(false)
        return
      }

      if (!formData.received_by) {
        toast.error("Sila pilih siapa yang terima stock")
        setLoading(false)
        return
      }

      if (isNaN(quantity) || quantity <= 0) {
        toast.error("Sila masukkan kuantiti yang sah")
        setLoading(false)
        return
      }

      const response = await fetch("/api/inventory/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient_id: formData.ingredient_id,
          type: formData.type,
          quantity,
          unit_cost: unitCost,
          total_cost: totalCost,
          supplier_id: formData.type === "in" && formData.supplier_id ? formData.supplier_id : undefined,
          received_by: formData.received_by,
          notes: formData.notes || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.message || data.error || "Gagal kemaskini stock")
        setLoading(false)
        return
      }

      toast.success("Berjaya kemaskini stock!")

      setFormData({
        ingredient_id: "",
        supplier_id: "",
        received_by: "",
        quantity: "",
        unit_cost: "",
        total_cost: "",
        type: "in",
        notes: "",
      })

      setOpen(false)
      window.location.reload()
    } catch (error: any) {
      console.error("[v0] Stock update exception:", error)
      toast.error(`Gagal kemaskini stock: ${error?.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  function getQuantityLabel() {
    if (!selectedIngredient) return "Quantity"
    const unitInfo = INGREDIENT_UNITS.find((u) => u.value === selectedIngredient.unit)
    return unitInfo ? `Quantity (${unitInfo.fullLabel})` : `Quantity (${selectedIngredient.unit})`
  }

  const selectedIngredient = ingredients.find((i) => i.id === formData.ingredient_id)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Stock Movement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ingredient">Ingredient</Label>
            <Select
              value={formData.ingredient_id}
              onValueChange={(value) => setFormData({ ...formData, ingredient_id: value })}
              required
            >
              <SelectTrigger id="ingredient">
                <SelectValue placeholder="Select ingredient" />
              </SelectTrigger>
              <SelectContent>
                {ingredients.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No ingredients found</div>
                ) : (
                  ingredients.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} (Current: {ingredient.current_stock} {ingredient.unit})
                      {ingredient.avg_cost_per_unit > 0 && ` - Avg: BND ${ingredient.avg_cost_per_unit.toFixed(4)}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Movement Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "in" | "out" | "adjustment") => setFormData({ ...formData, type: value })}
              required
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Stock In (Purchase)</SelectItem>
                <SelectItem value="out">Stock Out (Wastage)</SelectItem>
                <SelectItem value="adjustment">Adjustment (Count Fix)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === "in" && (
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier (Optional)</Label>
              <Select
                value={formData.supplier_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="No supplier selected" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.contact_person})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="received_by">Received By *</Label>
            <Select
              value={formData.received_by}
              onValueChange={(value) => setFormData({ ...formData, received_by: value })}
              required
            >
              <SelectTrigger id="received_by">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No employees found</div>
                ) : (
                  employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">{getQuantityLabel()}</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              value={formData.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              required
            />
          </div>

          {formData.type === "in" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Enter total cost OR cost per unit. The other will auto-calculate.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_cost">Total Cost (BND)</Label>
                  <Input
                    id="total_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_cost}
                    onChange={(e) => handleTotalCostChange(e.target.value)}
                    placeholder="e.g. 150.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Cost per Unit (BND)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => handleUnitCostChange(e.target.value)}
                    placeholder="e.g. 5.50"
                  />
                </div>
              </div>

              {selectedIngredient?.avg_cost_per_unit > 0 && (
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  Current weighted avg cost: <strong>BND {selectedIngredient.avg_cost_per_unit.toFixed(4)}</strong>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this stock movement"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Stock Movement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

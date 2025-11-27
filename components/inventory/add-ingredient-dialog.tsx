"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PackagePlus } from "lucide-react"
import type { Supplier } from "@/lib/types"

interface AddIngredientDialogProps {
  suppliers: Supplier[]
}

export function AddIngredientDialog({ suppliers }: AddIngredientDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch("/api/inventory/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name") as string,
          unit: formData.get("unit") as string,
          current_stock: Number(formData.get("current_stock")) || 0,
          min_stock: Number(formData.get("min_stock")) || 0,
          cost_per_unit: Number(formData.get("cost_per_unit")) || 0,
          supplier_id: formData.get("supplier_id") || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add ingredient")
      }

      setOpen(false)
      window.location.reload()
    } catch (error: any) {
      console.error("Error adding ingredient:", error)
      alert(error.message || "Gagal menambah ingredient")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PackagePlus className="mr-2 h-4 w-4" />
          New Ingredient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Ingredient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="kg, liter, pcs" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_stock">Initial Stock</Label>
              <Input id="current_stock" name="current_stock" type="number" step="0.001" defaultValue="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_stock">Min Stock Alert</Label>
              <Input id="min_stock" name="min_stock" type="number" step="0.001" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_per_unit">Cost/Unit (RM)</Label>
              <Input id="cost_per_unit" name="cost_per_unit" type="number" step="0.01" defaultValue="0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier_id">Supplier</Label>
            <Select name="supplier_id">
              <SelectTrigger>
                <SelectValue placeholder="Select supplier (optional)" />
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

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Ingredient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

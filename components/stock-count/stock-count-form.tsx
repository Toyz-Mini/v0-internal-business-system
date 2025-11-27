"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Search, CheckCircle, AlertTriangle, Loader2, Package } from "lucide-react"
import { toast } from "sonner"
import type { Ingredient, StockCount, User } from "@/lib/types"

interface StockCountFormProps {
  type: "opening" | "closing"
  ingredients: Ingredient[]
  currentUser: User | null
  existingCount?: StockCount | null
  onComplete: () => void
  onCancel: () => void
}

interface CountItem {
  ingredient_id: string
  ingredient: Ingredient
  quantity_counted: number | null
  expected_quantity: number
  not_counted: boolean
}

export function StockCountForm({
  type,
  ingredients,
  currentUser,
  existingCount,
  onComplete,
  onCancel,
}: StockCountFormProps) {
  const supabase = createClient()

  const [stockCountId, setStockCountId] = useState<string | null>(existingCount?.id || null)
  const [items, setItems] = useState<CountItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "low" | "high">("all")
  const [notes, setNotes] = useState(existingCount?.notes || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)

  // Initialize items from ingredients
  useEffect(() => {
    const initialItems: CountItem[] = ingredients.map((ing) => {
      // Check if we have existing count data
      const existingItem = existingCount?.items?.find((item) => item.ingredient_id === ing.id)

      return {
        ingredient_id: ing.id,
        ingredient: ing,
        quantity_counted: existingItem?.quantity_counted ?? null,
        expected_quantity:
          type === "opening" ? ing.current_stock : (existingItem?.expected_quantity ?? ing.current_stock),
        not_counted: existingItem?.not_counted ?? false,
      }
    })
    setItems(initialItems)
  }, [ingredients, existingCount, type])

  // Create draft on first load if no existing count
  useEffect(() => {
    if (!stockCountId && currentUser) {
      createDraft()
    }
  }, [currentUser])

  async function createDraft() {
    if (!currentUser) return

    try {
      const { data, error } = await supabase
        .from("stock_counts")
        .insert({
          type,
          counted_by: currentUser.id,
          status: "draft",
          photos: [],
        })
        .select()
        .single()

      if (error) throw error
      setStockCountId(data.id)
    } catch (error) {
      console.error("Error creating draft:", error)
      toast.error("Gagal mencipta draf kiraan stok")
    }
  }

  function updateItemCount(ingredientId: string, value: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.ingredient_id === ingredientId
          ? { ...item, quantity_counted: value === "" ? null : Number.parseFloat(value) }
          : item,
      ),
    )
  }

  function toggleNotCounted(ingredientId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.ingredient_id === ingredientId
          ? { ...item, not_counted: !item.not_counted, quantity_counted: null }
          : item,
      ),
    )
  }

  // Filter and search items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      const matchesSearch = item.ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())

      // Category filter
      if (filter === "low") {
        return matchesSearch && item.ingredient.current_stock <= item.ingredient.min_stock
      }
      if (filter === "high") {
        return matchesSearch && item.ingredient.cost_per_unit >= 10 // High value items
      }
      return matchesSearch
    })
  }, [items, searchQuery, filter])

  // Calculate stats
  const stats = useMemo(() => {
    const counted = items.filter((i) => i.quantity_counted !== null).length
    const skipped = items.filter((i) => i.not_counted).length
    const total = items.length

    let totalVariance = 0
    items.forEach((item) => {
      if (item.quantity_counted !== null && !item.not_counted) {
        const variance = (item.quantity_counted - item.expected_quantity) * item.ingredient.cost_per_unit
        totalVariance += variance
      }
    })

    return { counted, skipped, total, totalVariance }
  }, [items])

  async function handleSubmit() {
    if (!stockCountId || !currentUser) return

    setIsSubmitting(true)
    try {
      // Save all items
      const itemsToSave = items.map((item) => ({
        stock_count_id: stockCountId,
        ingredient_id: item.ingredient_id,
        unit: item.ingredient.unit,
        quantity_counted: item.quantity_counted,
        expected_quantity: item.expected_quantity,
        not_counted: item.not_counted,
        unit_cost: item.ingredient.cost_per_unit,
      }))

      // Delete existing items first
      await supabase.from("stock_count_items").delete().eq("stock_count_id", stockCountId)

      // Insert new items
      const { error: itemsError } = await supabase.from("stock_count_items").insert(itemsToSave)

      if (itemsError) throw itemsError

      // Calculate variances using RPC
      const { error: calcError } = await supabase.rpc("calculate_stock_count_variances", {
        p_stock_count_id: stockCountId,
      })

      if (calcError) {
        console.warn("Variance calculation RPC failed, calculating locally")
      }

      // Update stock count status to submitted
      const { error: updateError } = await supabase
        .from("stock_counts")
        .update({
          status: "submitted",
          notes,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", stockCountId)

      if (updateError) throw updateError

      toast.success(
        type === "opening"
          ? "Kiraan pembukaan dihantar. POS boleh dibuka."
          : "Kiraan penutupan dihantar. Menunggu kelulusan jika ada varians.",
      )
      onComplete()
    } catch (error) {
      console.error("Error submitting stock count:", error)
      toast.error("Gagal menghantar kiraan stok")
    } finally {
      setIsSubmitting(false)
      setShowConfirmDialog(false)
    }
  }

  async function saveDraft() {
    if (!stockCountId) return

    try {
      // Save items as draft
      const itemsToSave = items
        .filter((item) => item.quantity_counted !== null || item.not_counted)
        .map((item) => ({
          stock_count_id: stockCountId,
          ingredient_id: item.ingredient_id,
          unit: item.ingredient.unit,
          quantity_counted: item.quantity_counted,
          expected_quantity: item.expected_quantity,
          not_counted: item.not_counted,
          unit_cost: item.ingredient.cost_per_unit,
        }))

      if (itemsToSave.length > 0) {
        await supabase.from("stock_count_items").delete().eq("stock_count_id", stockCountId)

        await supabase.from("stock_count_items").insert(itemsToSave)
      }

      await supabase.from("stock_counts").update({ notes }).eq("id", stockCountId)

      toast.success("Draf disimpan")
    } catch (error) {
      console.error("Error saving draft:", error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{type === "opening" ? "Kiraan Pembukaan" : "Kiraan Penutupan"}</h1>
              <p className="text-sm text-muted-foreground">
                {currentUser?.name} • {new Date().toLocaleDateString("ms-MY")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={saveDraft}>
            Simpan Draf
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 text-sm">
          <div className="flex items-center gap-4">
            <span>
              <strong>{stats.counted}</strong>/{stats.total} dikira
            </span>
            {stats.skipped > 0 && <span className="text-muted-foreground">{stats.skipped} dilangkau</span>}
          </div>
          <div
            className={`font-medium ${stats.totalVariance < 0 ? "text-red-500" : stats.totalVariance > 0 ? "text-green-500" : ""}`}
          >
            Varians: BND {stats.totalVariance.toFixed(2)}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari bahan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {[
              { value: "all", label: "Semua" },
              { value: "low", label: "Rendah" },
              { value: "high", label: "Mahal" },
            ].map((f) => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value as any)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-auto p-4 space-y-2 pb-32">
        {filteredItems.map((item) => (
          <Card key={item.ingredient_id} className={item.not_counted ? "opacity-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{item.ingredient.name}</span>
                    <Badge variant="outline" className="flex-shrink-0">
                      {item.ingredient.unit}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Dijangka: {item.expected_quantity.toFixed(2)}</span>
                    <span>BND {item.ingredient.cost_per_unit.toFixed(2)}/unit</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!item.not_counted && (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={item.quantity_counted ?? ""}
                      onChange={(e) => updateItemCount(item.ingredient_id, e.target.value)}
                      className="w-24 text-right font-mono"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleNotCounted(item.ingredient_id)}
                    title={item.not_counted ? "Kira item ini" : "Langkau item ini"}
                  >
                    {item.not_counted ? (
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Skip</span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Variance indicator */}
              {item.quantity_counted !== null && !item.not_counted && (
                <div className="mt-2 pt-2 border-t">
                  {(() => {
                    const variance = item.quantity_counted - item.expected_quantity
                    const varianceValue = variance * item.ingredient.cost_per_unit
                    const isNegative = variance < 0

                    return (
                      <div
                        className={`flex items-center justify-between text-sm ${
                          isNegative ? "text-red-500" : variance > 0 ? "text-green-500" : "text-muted-foreground"
                        }`}
                      >
                        <span>
                          Varians: {variance >= 0 ? "+" : ""}
                          {variance.toFixed(2)} {item.ingredient.unit}
                        </span>
                        <span className="font-medium">
                          BND {varianceValue >= 0 ? "+" : ""}
                          {varianceValue.toFixed(2)}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Tiada bahan dijumpai</div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-3">
        <Textarea
          placeholder="Nota tambahan (pilihan)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        <Button onClick={() => setShowConfirmDialog(true)} className="w-full h-12" disabled={stats.counted === 0}>
          Hantar Kiraan ({stats.counted} item)
        </Button>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sahkan Kiraan Stok</DialogTitle>
            <DialogDescription>Sila semak ringkasan kiraan sebelum menghantar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Item dikira</p>
                <p className="font-medium">
                  {stats.counted} daripada {stats.total}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Item dilangkau</p>
                <p className="font-medium">{stats.skipped}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jumlah Varians</p>
                <p className={`font-medium ${stats.totalVariance < 0 ? "text-red-500" : "text-green-500"}`}>
                  BND {stats.totalVariance.toFixed(2)}
                </p>
              </div>
            </div>

            {Math.abs(stats.totalVariance) > 100 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p>Varians melebihi BND 100. Kelulusan pengurus mungkin diperlukan.</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="confirm"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
              />
              <label htmlFor="confirm" className="text-sm">
                Saya sahkan kiraan ini adalah tepat dan lengkap.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={!confirmChecked || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghantar...
                </>
              ) : (
                "Hantar Kiraan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

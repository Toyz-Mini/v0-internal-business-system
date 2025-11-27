"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { formatCurrency, formatModifierPrice } from "@/lib/ux-utils"
import type { Product, ModifierGroup } from "@/lib/types"

interface ProductGridProps {
  products: Product[]
  modifierGroups: ModifierGroup[]
  onAddToCart: (product: Product, modifiers: { name: string; price: number }[]) => void
}

export function ProductGrid({ products, modifierGroups, onAddToCart }: ProductGridProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<{ name: string; price: number }[]>([])

  const handleProductClick = (product: Product) => {
    if (modifierGroups.length > 0) {
      setSelectedProduct(product)
      setSelectedModifiers([])
    } else {
      onAddToCart(product, [])
    }
  }

  const handleAddWithModifiers = () => {
    if (selectedProduct) {
      onAddToCart(selectedProduct, selectedModifiers)
      setSelectedProduct(null)
      setSelectedModifiers([])
    }
  }

  const toggleModifier = (name: string, price: number, groupName: string, maxSelections: number) => {
    setSelectedModifiers((prev) => {
      const existing = prev.find((m) => m.name === name)
      if (existing) {
        return prev.filter((m) => m.name !== name)
      }

      if (maxSelections === 1) {
        const groupModifiers = modifierGroups.find((g) => g.name === groupName)?.modifiers?.map((m) => m.name) || []
        const filtered = prev.filter((m) => !groupModifiers.includes(m.name))
        return [...filtered, { name, price }]
      }

      return [...prev, { name, price }]
    })
  }

  const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0)

  if (products.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Tiada produk dijumpai</p>
          <p className="text-sm text-muted-foreground mt-1">Cuba cari dengan kata kunci lain</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
        {products.map((product) => (
          <Card
            key={product.id}
            className="group cursor-pointer overflow-hidden transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] bg-white border"
            onClick={() => handleProductClick(product)}
          >
            <div className="aspect-square bg-muted/30 relative overflow-hidden">
              {product.image_url ? (
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <span className="text-3xl opacity-40">🍗</span>
                </div>
              )}

              {/* Quick Add Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
                  <Plus className="h-4 w-4" />
                </div>
              </div>

              {/* Stock Badge - only show if low */}
              {product.track_stock && product.stock_quantity !== undefined && product.stock_quantity <= 5 && (
                <Badge
                  variant={product.stock_quantity === 0 ? "destructive" : "secondary"}
                  className="absolute top-1 right-1 text-[10px] px-1 py-0"
                >
                  {product.stock_quantity === 0 ? "Habis" : product.stock_quantity}
                </Badge>
              )}
            </div>

            <div className="p-2">
              <h3 className="font-medium text-xs line-clamp-2 leading-tight min-h-[2rem]">{product.name}</h3>
              <p className="text-lg font-bold text-primary mt-1">{formatCurrency(product.price)}</p>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl">{selectedProduct?.name}</DialogTitle>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency((selectedProduct?.price || 0) + modifierTotal)}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {modifierGroups.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{group.name}</h4>
                  {group.is_required && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      Wajib
                    </Badge>
                  )}
                </div>

                {group.max_selections === 1 ? (
                  <RadioGroup
                    onValueChange={(value) => {
                      const modifier = group.modifiers?.find((m) => m.name === value)
                      if (modifier) {
                        toggleModifier(modifier.name, modifier.price_adjustment, group.name, 1)
                      }
                    }}
                  >
                    <div className="grid gap-1.5">
                      {group.modifiers?.map((modifier) => (
                        <Label
                          key={modifier.id}
                          htmlFor={modifier.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                        >
                          <RadioGroupItem value={modifier.name} id={modifier.id} />
                          <span className="flex-1 text-sm">{modifier.name}</span>
                          {modifier.price_adjustment > 0 && (
                            <span className="text-xs font-medium text-primary">
                              {formatModifierPrice(modifier.price_adjustment, "BND")}
                            </span>
                          )}
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="grid gap-1.5">
                    {group.modifiers?.map((modifier) => (
                      <Label
                        key={modifier.id}
                        htmlFor={modifier.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                      >
                        <Checkbox
                          id={modifier.id}
                          checked={selectedModifiers.some((m) => m.name === modifier.name)}
                          onCheckedChange={() =>
                            toggleModifier(modifier.name, modifier.price_adjustment, group.name, group.max_selections)
                          }
                        />
                        <span className="flex-1 text-sm">{modifier.name}</span>
                        {modifier.price_adjustment > 0 && (
                          <span className="text-xs font-medium text-primary">
                            {formatModifierPrice(modifier.price_adjustment, "BND")}
                          </span>
                        )}
                      </Label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t bg-background">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setSelectedProduct(null)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={handleAddWithModifiers}>
              Tambah
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

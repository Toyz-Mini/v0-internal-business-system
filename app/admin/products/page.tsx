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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Pencil, Trash2, Package, X } from "lucide-react"
import type { Product, Category, Ingredient, ModifierGroup, Recipe } from "@/lib/types"
import { ProductImageUpload } from "@/components/admin/product-image-upload"

interface ProductWithRelations extends Product {
  category?: Category
  recipes?: (Recipe & { ingredient: Ingredient })[]
  modifier_groups?: ModifierGroup[]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    price: "",
    image_url: "",
    is_active: true,
  })
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])
  const [recipeItems, setRecipeItems] = useState<{ ingredient_id: string; qty_per_unit: string }[]>([])
  const [productImages, setProductImages] = useState<
    { storage_path: string; public_url: string; is_primary: boolean }[]
  >([])

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [productsRes, categoriesRes, ingredientsRes, modifiersRes] = await Promise.all([
      supabase
        .from("products")
        .select(`
        *,
        category:categories(*),
        recipes(*, ingredient:ingredients(*))
      `)
        .order("name"),
      supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("ingredients").select("*").eq("is_active", true).order("name"),
      supabase.from("modifier_groups").select("*").order("name"),
    ])

    if (productsRes.data) {
      // Fetch product modifiers separately
      const productIds = productsRes.data.map((p) => p.id)
      const { data: productModifiers } = await supabase
        .from("product_modifiers")
        .select("product_id, modifier_group_id")
        .in("product_id", productIds)

      const productsWithModifiers = productsRes.data.map((product) => ({
        ...product,
        modifier_groups:
          modifiersRes.data?.filter((mg) =>
            productModifiers?.some((pm) => pm.product_id === product.id && pm.modifier_group_id === mg.id),
          ) || [],
      }))
      setProducts(productsWithModifiers)
    }
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (ingredientsRes.data) setIngredients(ingredientsRes.data)
    if (modifiersRes.data) setModifierGroups(modifiersRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const calculateCOGS = () => {
    return recipeItems.reduce((total, item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredient_id)
      if (!ingredient) return total
      return total + Number.parseFloat(item.qty_per_unit || "0") * ingredient.cost_per_unit
    }, 0)
  }

  const openAddDialog = () => {
    setSelectedProduct(null)
    setFormData({
      name: "",
      description: "",
      category_id: "",
      price: "",
      image_url: "",
      is_active: true,
    })
    setSelectedModifiers([])
    setRecipeItems([])
    setProductImages([])
    setDialogOpen(true)
  }

  const openEditDialog = async (product: ProductWithRelations) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "",
      price: product.price.toString(),
      image_url: product.image_url || "",
      is_active: product.is_active,
    })

    // Fetch product modifiers
    const supabase = createClient()
    const { data: productModifiers } = await supabase
      .from("product_modifiers")
      .select("modifier_group_id")
      .eq("product_id", product.id)

    setSelectedModifiers(productModifiers?.map((pm) => pm.modifier_group_id) || [])

    const { data: images } = await supabase
      .from("product_images")
      .select("storage_path, public_url, is_primary")
      .eq("product_id", product.id)
      .order("is_primary", { ascending: false })

    setProductImages(images || [])
    setRecipeItems(
      product.recipes?.map((r) => ({
        ingredient_id: r.ingredient_id,
        qty_per_unit: r.qty_per_unit.toString(),
      })) || [],
    )
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast({ title: "Error", description: "Nama dan harga wajib diisi", variant: "destructive" })
      return
    }

    setSaving(true)
    const supabase = createClient()
    const cogs = calculateCOGS()

    try {
      let productId = selectedProduct?.id

      const primaryImage = productImages.find((img) => img.is_primary)
      const imageUrl = primaryImage?.public_url || formData.image_url

      if (selectedProduct) {
        // Update product
        const { error } = await supabase
          .from("products")
          .update({
            name: formData.name,
            description: formData.description || null,
            category_id: formData.category_id || null,
            price: Number.parseFloat(formData.price),
            cost: cogs,
            image_url: imageUrl || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedProduct.id)

        if (error) throw error
      } else {
        // Create product
        const { data, error } = await supabase
          .from("products")
          .insert({
            name: formData.name,
            description: formData.description || null,
            category_id: formData.category_id || null,
            price: Number.parseFloat(formData.price),
            cost: cogs,
            image_url: imageUrl || null,
            is_active: formData.is_active,
          })
          .select()
          .single()

        if (error) throw error
        productId = data.id
      }

      await supabase.from("product_images").delete().eq("product_id", productId)
      if (productImages.length > 0) {
        await supabase.from("product_images").insert(
          productImages.map((img) => ({
            product_id: productId,
            storage_path: img.storage_path,
            public_url: img.public_url,
            is_primary: img.is_primary,
          })),
        )
      }

      // Update recipes
      await supabase.from("recipes").delete().eq("product_id", productId)
      if (recipeItems.length > 0) {
        const validRecipes = recipeItems.filter((r) => r.ingredient_id && Number.parseFloat(r.qty_per_unit) > 0)
        if (validRecipes.length > 0) {
          await supabase.from("recipes").insert(
            validRecipes.map((r) => ({
              product_id: productId,
              ingredient_id: r.ingredient_id,
              qty_per_unit: Number.parseFloat(r.qty_per_unit),
            })),
          )
        }
      }

      // Update product modifiers
      await supabase.from("product_modifiers").delete().eq("product_id", productId)
      if (selectedModifiers.length > 0) {
        await supabase.from("product_modifiers").insert(
          selectedModifiers.map((mg_id) => ({
            product_id: productId,
            modifier_group_id: mg_id,
          })),
        )
      }

      toast({ title: "Berjaya", description: selectedProduct ? "Produk dikemaskini" : "Produk ditambah" })
      setDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProduct) return

    const supabase = createClient()
    try {
      // Delete related records first
      await supabase.from("recipes").delete().eq("product_id", selectedProduct.id)
      await supabase.from("product_modifiers").delete().eq("product_id", selectedProduct.id)
      await supabase.from("product_images").delete().eq("product_id", selectedProduct.id)

      const { error } = await supabase.from("products").delete().eq("id", selectedProduct.id)

      if (error) throw error

      toast({ title: "Berjaya", description: "Produk dipadam" })
      setDeleteDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const addRecipeItem = () => {
    setRecipeItems([...recipeItems, { ingredient_id: "", qty_per_unit: "" }])
  }

  const removeRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index))
  }

  const updateRecipeItem = (index: number, field: string, value: string) => {
    const updated = [...recipeItems]
    updated[index] = { ...updated[index], [field]: value }
    setRecipeItems(updated)
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Product Management</h1>
            <p className="text-muted-foreground">Urus menu dan produk anda</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari produk..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Senarai Produk ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Memuatkan...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Kos</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const margin =
                      product.price > 0 ? (((product.price - product.cost) / product.price) * 100).toFixed(1) : "0"
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url || "/placeholder.svg"}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.recipes && product.recipes.length > 0 && (
                                <p className="text-xs text-muted-foreground">{product.recipes.length} bahan</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.category?.name || "-"}</TableCell>
                        <TableCell className="text-right font-medium">BND {product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          BND {product.cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              Number.parseFloat(margin) > 50
                                ? "text-green-600"
                                : Number.parseFloat(margin) > 30
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }
                          >
                            {margin}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedProduct(product)
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Produk *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="cth: Ayam Goreng 2 Pcs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Penerangan</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Penerangan produk (optional)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Harga (BND) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <ProductImageUpload images={productImages} onChange={setProductImages} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Produk Aktif</Label>
            </div>

            {/* Recipe Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Resepi (Bahan-bahan)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRecipeItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah Bahan
                </Button>
              </div>

              {recipeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tiada bahan ditambah. Klik "Tambah Bahan" untuk set resepi.
                </p>
              ) : (
                <div className="space-y-2">
                  {recipeItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={item.ingredient_id}
                        onValueChange={(value) => updateRecipeItem(index, "ingredient_id", value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Pilih bahan" />
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
                        step="0.001"
                        placeholder="Qty"
                        className="w-24"
                        value={item.qty_per_unit}
                        onChange={(e) => updateRecipeItem(index, "qty_per_unit", e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRecipeItem(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {recipeItems.length > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">
                    <strong>Kos Bahan (COGS):</strong> BND {calculateCOGS().toFixed(2)}
                  </p>
                  {formData.price && (
                    <p className="text-sm text-muted-foreground">
                      Margin:{" "}
                      {(
                        ((Number.parseFloat(formData.price) - calculateCOGS()) / Number.parseFloat(formData.price)) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modifier Groups */}
            <div className="space-y-3">
              <Label>Modifier Groups</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {modifierGroups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`modifier-${group.id}`}
                      checked={selectedModifiers.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModifiers([...selectedModifiers, group.id])
                        } else {
                          setSelectedModifiers(selectedModifiers.filter((id) => id !== group.id))
                        }
                      }}
                    />
                    <Label htmlFor={`modifier-${group.id}`} className="font-normal">
                      {group.name}
                      {group.is_required && <span className="text-xs text-muted-foreground ml-1">(Wajib)</span>}
                    </Label>
                  </div>
                ))}
              </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti untuk memadam "{selectedProduct?.name}"? Tindakan ini tidak boleh dibatalkan.
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

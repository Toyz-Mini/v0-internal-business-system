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
import { useToast } from "@/hooks/use-toast"
import { Plus, Pencil, Trash2, Layers, ArrowUp, ArrowDown } from "lucide-react"
import type { Category } from "@/lib/types"

interface CategoryWithCount extends Category {
  product_count?: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithCount | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sort_order: "0",
    is_active: true,
  })

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const { data: categoriesData } = await supabase.from("categories").select("*").order("sort_order")

    if (categoriesData) {
      // Get product counts
      const { data: products } = await supabase.from("products").select("category_id")

      const counts: Record<string, number> = {}
      products?.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1
        }
      })

      setCategories(
        categoriesData.map((cat) => ({
          ...cat,
          product_count: counts[cat.id] || 0,
        })),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAddDialog = () => {
    setSelectedCategory(null)
    setFormData({
      name: "",
      description: "",
      sort_order: (categories.length + 1).toString(),
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEditDialog = (category: CategoryWithCount) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      sort_order: category.sort_order.toString(),
      is_active: category.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Nama kategori wajib diisi", variant: "destructive" })
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (selectedCategory) {
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name,
            description: formData.description || null,
            sort_order: Number.parseInt(formData.sort_order),
            is_active: formData.is_active,
          })
          .eq("id", selectedCategory.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("categories").insert({
          name: formData.name,
          description: formData.description || null,
          sort_order: Number.parseInt(formData.sort_order),
          is_active: formData.is_active,
        })

        if (error) throw error
      }

      toast({ title: "Berjaya", description: selectedCategory ? "Kategori dikemaskini" : "Kategori ditambah" })
      setDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCategory) return

    if ((selectedCategory.product_count || 0) > 0) {
      toast({
        title: "Error",
        description: "Tidak boleh padam kategori yang mempunyai produk",
        variant: "destructive",
      })
      setDeleteDialogOpen(false)
      return
    }

    const supabase = createClient()
    try {
      const { error } = await supabase.from("categories").delete().eq("id", selectedCategory.id)

      if (error) throw error

      toast({ title: "Berjaya", description: "Kategori dipadam" })
      setDeleteDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const moveCategory = async (category: CategoryWithCount, direction: "up" | "down") => {
    const currentIndex = categories.findIndex((c) => c.id === category.id)
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

    if (newIndex < 0 || newIndex >= categories.length) return

    const supabase = createClient()
    const swapCategory = categories[newIndex]

    await Promise.all([
      supabase.from("categories").update({ sort_order: newIndex }).eq("id", category.id),
      supabase.from("categories").update({ sort_order: currentIndex }).eq("id", swapCategory.id),
    ])

    fetchData()
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kategori</h1>
            <p className="text-muted-foreground">Urus kategori produk</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Kategori
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Senarai Kategori ({categories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Memuatkan...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Urutan</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Penerangan</TableHead>
                    <TableHead className="text-right">Produk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => moveCategory(category, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === categories.length - 1}
                            onClick={() => moveCategory(category, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">{category.description || "-"}</TableCell>
                      <TableCell className="text-right">{category.product_count}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedCategory(category)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Kategori *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="cth: Ayam Goreng"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Penerangan</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Penerangan kategori (optional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Urutan</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Kategori Aktif</Label>
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
            <AlertDialogTitle>Padam Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              {(selectedCategory?.product_count || 0) > 0 ? (
                <span className="text-destructive">
                  Kategori ini mempunyai {selectedCategory?.product_count} produk dan tidak boleh dipadam.
                </span>
              ) : (
                <>Adakah anda pasti untuk memadam "{selectedCategory?.name}"?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={(selectedCategory?.product_count || 0) > 0}
            >
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}

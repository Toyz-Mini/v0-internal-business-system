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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Plus, Pencil, Trash2, Settings2, X } from "lucide-react"
import { formatModifierPrice } from "@/lib/ux-utils"

interface Modifier {
  id: string
  group_id: string
  name: string
  price_adjustment: number
  is_active: boolean
  created_at: string
}

interface ModifierGroup {
  id: string
  name: string
  is_required: boolean
  max_selections: number
  created_at: string
  modifiers?: Modifier[]
}

export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    is_required: false,
    max_selections: "1",
  })
  const [modifiers, setModifiers] = useState<{ name: string; price_adjustment: string; is_active: boolean }[]>([])

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const { data: groupsData } = await supabase.from("modifier_groups").select("*").order("name")

    if (groupsData) {
      const { data: modifiersData } = await supabase.from("modifiers").select("*").order("name")

      const groupsWithModifiers = groupsData.map((group) => ({
        ...group,
        modifiers: modifiersData?.filter((mod) => mod.group_id === group.id) || [],
      }))

      setGroups(groupsWithModifiers)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAddDialog = () => {
    setSelectedGroup(null)
    setFormData({
      name: "",
      is_required: false,
      max_selections: "1",
    })
    setModifiers([{ name: "", price_adjustment: "0", is_active: true }])
    setDialogOpen(true)
  }

  const openEditDialog = (group: ModifierGroup) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      is_required: group.is_required,
      max_selections: group.max_selections.toString(),
    })
    setModifiers(
      group.modifiers?.map((mod) => ({
        name: mod.name,
        price_adjustment: mod.price_adjustment.toString(),
        is_active: mod.is_active,
      })) || [{ name: "", price_adjustment: "0", is_active: true }],
    )
    setDialogOpen(true)
  }

  const addModifier = () => {
    setModifiers([...modifiers, { name: "", price_adjustment: "0", is_active: true }])
  }

  const removeModifier = (index: number) => {
    setModifiers(modifiers.filter((_, i) => i !== index))
  }

  const updateModifier = (index: number, field: string, value: string | boolean) => {
    const updated = [...modifiers]
    updated[index] = { ...updated[index], [field]: value }
    setModifiers(updated)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Nama group wajib diisi", variant: "destructive" })
      return
    }

    const validModifiers = modifiers.filter((mod) => mod.name.trim())
    if (validModifiers.length === 0) {
      toast({ title: "Error", description: "Sekurang-kurangnya satu modifier diperlukan", variant: "destructive" })
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      let groupId = selectedGroup?.id

      if (selectedGroup) {
        // Update group
        const { error } = await supabase
          .from("modifier_groups")
          .update({
            name: formData.name,
            is_required: formData.is_required,
            max_selections: Number.parseInt(formData.max_selections),
          })
          .eq("id", selectedGroup.id)

        if (error) throw error
      } else {
        // Create group
        const { data, error } = await supabase
          .from("modifier_groups")
          .insert({
            name: formData.name,
            is_required: formData.is_required,
            max_selections: Number.parseInt(formData.max_selections),
          })
          .select()
          .single()

        if (error) throw error
        groupId = data.id
      }

      await supabase.from("modifiers").delete().eq("group_id", groupId)

      const { error: modifiersError } = await supabase.from("modifiers").insert(
        validModifiers.map((mod) => ({
          group_id: groupId,
          name: mod.name,
          price_adjustment: Number.parseFloat(mod.price_adjustment) || 0,
          is_active: mod.is_active,
        })),
      )

      if (modifiersError) throw modifiersError

      toast({ title: "Berjaya", description: selectedGroup ? "Modifier dikemaskini" : "Modifier ditambah" })
      setDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedGroup) return

    const supabase = createClient()
    try {
      // Check if used in products
      const { data: productModifiers } = await supabase
        .from("product_modifiers")
        .select("id")
        .eq("modifier_group_id", selectedGroup.id)
        .limit(1)

      if (productModifiers && productModifiers.length > 0) {
        toast({
          title: "Error",
          description: "Tidak boleh padam modifier yang digunakan dalam produk",
          variant: "destructive",
        })
        setDeleteDialogOpen(false)
        return
      }

      await supabase.from("modifiers").delete().eq("group_id", selectedGroup.id)

      const { error } = await supabase.from("modifier_groups").delete().eq("id", selectedGroup.id)

      if (error) throw error

      toast({ title: "Berjaya", description: "Modifier dipadam" })
      setDeleteDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Modifier Groups</h1>
            <p className="text-muted-foreground">Urus pilihan tambahan untuk produk</p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Modifier
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Senarai Modifier Groups ({groups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Memuatkan...</div>
            ) : groups.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Tiada modifier group. Klik "Tambah Modifier" untuk mula.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Group</TableHead>
                    <TableHead>Modifiers</TableHead>
                    <TableHead>Max Pilihan</TableHead>
                    <TableHead>Wajib?</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {group.modifiers?.map((mod) => (
                            <Badge key={mod.id} variant={mod.is_active ? "outline" : "secondary"} className="text-xs">
                              {mod.name}
                              {mod.price_adjustment !== 0 && (
                                <span
                                  className={mod.price_adjustment > 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}
                                >
                                  {formatModifierPrice(mod.price_adjustment, "BND")}
                                </span>
                              )}
                            </Badge>
                          ))}
                          {(!group.modifiers || group.modifiers.length === 0) && (
                            <span className="text-muted-foreground text-xs">Tiada modifier</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{group.max_selections}</TableCell>
                      <TableCell>
                        <Badge variant={group.is_required ? "default" : "secondary"}>
                          {group.is_required ? "Ya" : "Tidak"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(group)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedGroup(group)
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedGroup ? "Edit Modifier Group" : "Tambah Modifier Group Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Group *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="cth: Pedas Level"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max">Max Pilihan</Label>
                <Input
                  id="max"
                  type="number"
                  min="1"
                  value={formData.max_selections}
                  onChange={(e) => setFormData({ ...formData, max_selections: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-7">
                <Switch
                  id="required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
                <Label htmlFor="required">Wajib Pilih</Label>
              </div>
            </div>

            {/* Modifiers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Modifiers</Label>
                <Button type="button" variant="outline" size="sm" onClick={addModifier}>
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {modifiers.map((mod, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Nama modifier"
                      className="flex-1"
                      value={mod.name}
                      onChange={(e) => updateModifier(index, "name", e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="+/-"
                      className="w-24"
                      value={mod.price_adjustment}
                      onChange={(e) => updateModifier(index, "price_adjustment", e.target.value)}
                    />
                    <Switch
                      checked={mod.is_active}
                      onCheckedChange={(checked) => updateModifier(index, "is_active", checked)}
                      title="Aktif"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeModifier(index)}
                      disabled={modifiers.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Masukkan nilai positif untuk tambah harga, negatif untuk tolak harga. Toggle untuk aktif/tidak aktif.
              </p>
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
            <AlertDialogTitle>Padam Modifier Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti untuk memadam "{selectedGroup?.name}"? Semua modifiers dalam group ini akan turut
              dipadam.
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

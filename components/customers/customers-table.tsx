"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MoreVertical, Search, Pencil, Trash2, Phone, History } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Customer } from "@/lib/types"

interface CustomersTableProps {
  customers: Customer[]
}

export function CustomersTable({ customers: initialCustomers }: CustomersTableProps) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id)
      if (error) throw error
      setCustomers((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete customer")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingCustomer) return

    setIsLoading(true)
    const supabase = createClient()
    const formData = new FormData(e.currentTarget)

    try {
      const tagsInput = formData.get("tags") as string
      const tags = tagsInput ? tagsInput.split(",").map((t) => t.trim()) : []

      const { error } = await supabase
        .from("customers")
        .update({
          name: formData.get("name") as string,
          phone: formData.get("phone") as string,
          email: formData.get("email") as string,
          tags,
          notes: formData.get("notes") as string,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCustomer.id)

      if (error) throw error

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? {
                ...c,
                name: formData.get("name") as string,
                phone: formData.get("phone") as string,
                email: formData.get("email") as string,
                tags,
                notes: formData.get("notes") as string,
              }
            : c,
        ),
      )
      setEditingCustomer(null)
    } catch (error) {
      console.error("Update error:", error)
      alert("Failed to update customer")
    } finally {
      setIsLoading(false)
    }
  }

  const getCustomerTier = (orderCount: number) => {
    if (orderCount >= 10) return { label: "VIP", variant: "default" as const }
    if (orderCount >= 5) return { label: "Loyal", variant: "secondary" as const }
    if (orderCount >= 1) return { label: "Regular", variant: "outline" as const }
    return { label: "New", variant: "outline" as const }
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const tier = getCustomerTier(customer.order_count)
                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <Badge variant={tier.variant} className="text-xs">
                            {tier.label}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{customer.order_count}</TableCell>
                    <TableCell className="text-right font-medium">BND {customer.total_spent.toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/customers/${customer.id}`}>
                              <History className="mr-2 h-4 w-4" />
                              Lihat Sejarah
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(customer.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={editingCustomer?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={editingCustomer?.phone || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={editingCustomer?.email || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                name="tags"
                defaultValue={editingCustomer?.tags?.join(", ") || ""}
                placeholder="loyal, vip, frequent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={editingCustomer?.notes || ""} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

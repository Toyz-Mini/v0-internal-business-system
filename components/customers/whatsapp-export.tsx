"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Download, Users } from "lucide-react"
import type { Customer } from "@/lib/types"

interface WhatsAppExportProps {
  customers: Customer[]
}

export function WhatsAppExport({ customers }: WhatsAppExportProps) {
  const [open, setOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [minOrders, setMinOrders] = useState(0)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])

  // Get unique tags
  const allTags = [...new Set(customers.flatMap((c) => c.tags || []))]

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    if (!c.phone) return false
    if (minOrders > 0 && c.order_count < minOrders) return false
    if (selectedTags.length > 0 && !selectedTags.some((tag) => c.tags?.includes(tag))) return false
    return true
  })

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const toggleCustomer = (id: string) => {
    setSelectedCustomers((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const selectAll = () => {
    setSelectedCustomers(filteredCustomers.map((c) => c.id))
  }

  const deselectAll = () => {
    setSelectedCustomers([])
  }

  const exportCSV = () => {
    const selected = customers.filter((c) => selectedCustomers.includes(c.id))
    const headers = ["Name", "Phone", "Email", "Tags", "Orders", "Total Spent"]
    const rows = selected.map((c) => [
      c.name,
      c.phone || "",
      c.email || "",
      (c.tags || []).join("; "),
      c.order_count,
      c.total_spent.toFixed(2),
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `whatsapp-contacts-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const exportPhoneList = () => {
    const selected = customers.filter((c) => selectedCustomers.includes(c.id))
    const phones = selected
      .map((c) => c.phone)
      .filter(Boolean)
      .join("\n")

    const blob = new Blob([phones], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `phone-list-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageSquare className="mr-2 h-4 w-4" />
          WhatsApp Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Export untuk WhatsApp Broadcast
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <Label>Filter by Tags</Label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Min Orders Filter */}
          <div className="flex items-center gap-4">
            <Label>Min Orders:</Label>
            <div className="flex gap-2">
              {[0, 1, 3, 5, 10].map((n) => (
                <Button
                  key={n}
                  variant={minOrders === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMinOrders(n)}
                >
                  {n === 0 ? "All" : `${n}+`}
                </Button>
              ))}
            </div>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedCustomers.length} of {filteredCustomers.length} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>

          {/* Customer List */}
          <ScrollArea className="h-[250px] border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredCustomers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No customers with phone numbers found</p>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => toggleCustomer(customer.id)}
                  >
                    <Checkbox checked={selectedCustomers.includes(customer.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>{customer.order_count} orders</p>
                      <p className="text-muted-foreground">BND {customer.total_spent.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Export Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={exportPhoneList}
            disabled={selectedCustomers.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Phone List (.txt)
          </Button>
          <Button className="flex-1" onClick={exportCSV} disabled={selectedCustomers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Full CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Package, Receipt, ShoppingCart, FileText, CalendarDays } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-auto flex-col gap-2 py-3 bg-transparent" asChild>
          <Link href="/pos">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="text-xs">Open POS</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-3 bg-transparent" asChild>
          <Link href="/admin/products">
            <Plus className="h-5 w-5 text-green-600" />
            <span className="text-xs">Add Product</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-3 bg-transparent" asChild>
          <Link href="/inventory?action=add">
            <Package className="h-5 w-5 text-blue-600" />
            <span className="text-xs">Add Stock</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-3 bg-transparent" asChild>
          <Link href="/expenses?action=add">
            <Receipt className="h-5 w-5 text-orange-600" />
            <span className="text-xs">Add Expense</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-3 bg-transparent" asChild>
          <Link href="/hr/claims">
            <FileText className="h-5 w-5 text-purple-600" />
            <span className="text-xs">Submit Claim</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-2 py-3 bg-transparent" asChild>
          <Link href="/hr/leave">
            <CalendarDays className="h-5 w-5 text-teal-600" />
            <span className="text-xs">Apply Leave</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

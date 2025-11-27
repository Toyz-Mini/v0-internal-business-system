"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import type { Ingredient } from "@/lib/types"

interface LowStockAlertProps {
  items: Ingredient[]
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Low Stock Alert
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All stock levels are OK</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Low Stock Alert
          <Badge variant="destructive" className="ml-auto">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-destructive">
                {(Number(item.current_stock) || 0).toFixed(2)} {item.unit}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

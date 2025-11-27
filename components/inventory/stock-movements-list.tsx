"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/ux-utils"

export function StockMovementsList() {
  const [stockLogs, setStockLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStockLogs()
  }, [])

  async function fetchStockLogs() {
    const supabase = createClient()
    const { data } = await supabase
      .from("stock_logs")
      .select(`
        *,
        ingredient:ingredients(name, unit),
        supplier:suppliers(name)
      `)
      .order("created_at", { ascending: false })
      .limit(100)

    if (data) setStockLogs(data)
    setLoading(false)
  }

  if (loading) return <div>Loading stock movements...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Stock Movements</CardTitle>
        <CardDescription>Last 100 stock transactions with cost tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Ingredient</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Received By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {new Date(log.created_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="font-medium">{log.ingredient?.name}</TableCell>
                <TableCell>
                  {log.type === "in" && <Badge className="bg-green-500">In</Badge>}
                  {log.type === "out" && <Badge variant="destructive">Out</Badge>}
                  {log.type === "adjustment" && <Badge variant="secondary">Adjust</Badge>}
                </TableCell>
                <TableCell>
                  {log.quantity > 0 ? "+" : ""}
                  {log.quantity} {log.ingredient?.unit}
                </TableCell>
                <TableCell>{log.unit_cost ? formatCurrency(log.unit_cost) : "-"}</TableCell>
                <TableCell className="font-medium">{log.total_cost ? formatCurrency(log.total_cost) : "-"}</TableCell>
                <TableCell>{log.supplier?.name || "-"}</TableCell>
                <TableCell className="text-sm">{log.received_by || "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {log.notes || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

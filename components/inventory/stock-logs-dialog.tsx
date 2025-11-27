"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { History } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { StockLog, Ingredient } from "@/lib/types"

export function StockLogsDialog() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<(StockLog & { ingredient: Ingredient })[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchLogs()
    }
  }, [open])

  const fetchLogs = async () => {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("stock_logs")
      .select("*, ingredient:ingredients(*)")
      .order("created_at", { ascending: false })
      .limit(100)

    if (!error && data) {
      setLogs(data)
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 h-4 w-4" />
          Stock Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Stock Movement History</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Before</TableHead>
                  <TableHead>After</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{new Date(log.created_at).toLocaleString("ms-MY")}</TableCell>
                    <TableCell className="font-medium">{log.ingredient?.name}</TableCell>
                    <TableCell>
                      <Badge variant={log.type === "in" ? "default" : log.type === "out" ? "destructive" : "secondary"}>
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.type === "in" ? "+" : log.type === "out" ? "-" : ""}
                      {Math.abs(log.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>{log.previous_stock?.toFixed(2) || "-"}</TableCell>
                    <TableCell>{log.new_stock?.toFixed(2) || "-"}</TableCell>
                    <TableCell className="text-sm">{log.received_by || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                      {log.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

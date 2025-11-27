"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface RecomputeStockButtonProps {
  hasStockLogs: boolean
}

export function RecomputeStockButton({ hasStockLogs }: RecomputeStockButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleRecompute() {
    setLoading(true)

    try {
      const response = await fetch("/api/inventory/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to recompute")
      }

      toast.success(data.message || "Stock levels recomputed successfully")

      // Refresh page to show updated stock
      window.location.reload()
    } catch (error) {
      console.error("Recompute error:", error)
      toast.error("Failed to recompute stock levels")
    } finally {
      setLoading(false)
    }
  }

  if (!hasStockLogs) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No stock logs yet. Add stock movements to begin tracking.</span>
      </div>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Stock
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Recompute All Stock Levels?</AlertDialogTitle>
          <AlertDialogDescription>
            This will recalculate all ingredient stock levels from stock logs. This is useful if you suspect stock
            levels are out of sync.
            <br />
            <br />
            <strong>Note:</strong> Current stock will be overwritten with calculated values from stock logs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRecompute} disabled={loading}>
            {loading ? "Recomputing..." : "Recompute Stock"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

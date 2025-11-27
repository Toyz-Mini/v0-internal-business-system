"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ClipboardCheck } from "lucide-react"
import { useRouter } from "next/navigation"

interface ShiftCloseCheckProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProceed: () => void
}

export function ShiftCloseCheck({ open, onOpenChange, onProceed }: ShiftCloseCheckProps) {
  const router = useRouter()
  const supabase = createClient()
  const [hasClosingCount, setHasClosingCount] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (open) {
      checkClosingCount()
    }
  }, [open])

  async function checkClosingCount() {
    setIsChecking(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const { data } = await supabase
        .from("stock_counts")
        .select("id, status")
        .eq("type", "closing")
        .in("status", ["submitted", "approved"])
        .gte("created_at", today)
        .limit(1)
        .single()

      setHasClosingCount(!!data)
    } catch {
      setHasClosingCount(false)
    } finally {
      setIsChecking(false)
    }
  }

  if (isChecking) {
    return null
  }

  if (hasClosingCount) {
    // Closing count done, allow proceed
    onProceed()
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <DialogTitle className="text-center">Kiraan Penutupan Diperlukan</DialogTitle>
          <DialogDescription className="text-center">
            Sila lengkapkan Kiraan Stok Penutupan sebelum tutup shift. Ini penting untuk audit dan rekonsiliasi
            inventori.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => {
              onOpenChange(false)
              router.push("/stock-count/new?type=closing")
            }}
            className="w-full"
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Mula Kiraan Penutupan
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

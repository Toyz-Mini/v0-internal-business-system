"use client"

import { useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ClipboardList } from "lucide-react"
import type { UserRole } from "@/lib/types"

interface POSGatingBlockProps {
  userRole: UserRole
  userName: string
  message: string
}

export function POSGatingBlock({ userRole, userName, message }: POSGatingBlockProps) {
  const router = useRouter()

  return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[80vh] p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle>POS Tidak Tersedia</CardTitle>
            <CardDescription className="text-base mt-2">{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted text-sm">
              <p className="font-medium mb-2">Kenapa perlu kiraan pembukaan?</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Memastikan stok dicatat dengan tepat</li>
                <li>Membolehkan pengiraan varians selepas tutup</li>
                <li>Menjadi audit trail untuk rekonsiliasi</li>
              </ul>
            </div>

            <Button onClick={() => router.push("/stock-count/new?type=opening")} className="w-full h-12">
              <ClipboardList className="h-5 w-5 mr-2" />
              Mula Kiraan Pembukaan
            </Button>

            <Button variant="outline" onClick={() => router.push("/dashboard")} className="w-full">
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

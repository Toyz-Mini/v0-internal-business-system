"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Download, Filter } from "lucide-react"

interface ReportFiltersProps {
  onFilterChange: (filters: {
    startDate: string
    endDate: string
    cashier: string
    paymentMethod: string
  }) => void
  onExport: () => void
  cashiers?: { id: string; name: string }[]
}

export function ReportFilters({ onFilterChange, onExport, cashiers = [] }: ReportFiltersProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0])
  const [cashier, setCashier] = useState("all")
  const [paymentMethod, setPaymentMethod] = useState("all")

  const applyFilters = () => {
    onFilterChange({ startDate, endDate, cashier, paymentMethod })
  }

  const setPreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(start.toISOString().split("T")[0])
    setEndDate(end.toISOString().split("T")[0])
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPreset(0)}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset(7)}>
                7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset(30)}>
                30 Days
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 w-40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pl-9 w-40" />
            </div>
          </div>

          {/* Cashier Filter */}
          {cashiers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cashier</Label>
              <Select value={cashier} onValueChange={setCashier}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cashiers</SelectItem>
                  {cashiers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Payment Method Filter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Payment</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="qrpay">QR Pay</SelectItem>
                <SelectItem value="bank_transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <Button onClick={applyFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>
            <Button variant="outline" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

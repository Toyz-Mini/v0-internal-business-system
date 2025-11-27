"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Expense, ExpenseCategory } from "@/lib/types"

interface ExpensesTableProps {
  expenses: (Expense & { category?: ExpenseCategory })[]
  categories: ExpenseCategory[]
}

export function ExpensesTable({ expenses }: ExpensesTableProps) {
  const [search, setSearch] = useState("")

  const filteredExpenses = expenses.filter(
    (e) =>
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return

    const supabase = createClient()
    const { error } = await supabase.from("expenses").delete().eq("id", id)

    if (error) {
      alert("Failed to delete expense")
    } else {
      window.location.reload()
    }
  }

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold">BND {totalExpenses.toFixed(2)}</span>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{new Date(expense.expense_date).toLocaleDateString("ms-MY")}</TableCell>
                <TableCell>
                  <Badge variant="outline">{expense.category?.name || "-"}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{expense.description || "-"}</TableCell>
                <TableCell className="text-right font-medium">BND {expense.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

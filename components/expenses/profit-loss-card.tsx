import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Package, Receipt } from "lucide-react"

interface ProfitLossCardProps {
  revenue: number
  cogs: number
  expenses: number
}

export function ProfitLossCard({ revenue, cogs, expenses }: ProfitLossCardProps) {
  const grossProfit = revenue - cogs
  const netProfit = grossProfit - expenses
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit & Loss Summary (This Month)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Revenue
            </div>
            <p className="text-2xl font-bold text-green-600">BND {revenue.toFixed(2)}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              COGS
            </div>
            <p className="text-2xl font-bold text-orange-600">BND {cogs.toFixed(2)}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Gross Profit
            </div>
            <p className="text-2xl font-bold text-blue-600">BND {grossProfit.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Margin: {grossMargin.toFixed(1)}%</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="h-4 w-4" />
              Expenses
            </div>
            <p className="text-2xl font-bold text-red-600">BND {expenses.toFixed(2)}</p>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Net Profit
            </div>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              BND {netProfit.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Margin: {netMargin.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

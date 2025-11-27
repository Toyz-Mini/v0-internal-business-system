"use client"

import { AppShell } from "@/components/layout/app-shell"
import { StatsCard } from "@/components/dashboard/stats-card"
import { LowStockAlert } from "@/components/dashboard/low-stock-alert"
import { ClockedInStaff } from "@/components/dashboard/clocked-in-staff"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { DollarSign, ShoppingCart, Receipt, TrendingUp, Package, Users } from "lucide-react"
import type { UserRole, Ingredient, Attendance, Employee } from "@/lib/types"
import { formatCurrency } from "@/lib/ux-utils"

interface DashboardClientProps {
  userRole: UserRole
  userName: string
  todaySales: number
  todayOrders: number
  todayExpenses: number
  lowStockItems: Ingredient[]
  clockedInStaff: (Attendance & { employee: Employee | null })[]
}

export function DashboardClient({
  userRole,
  userName,
  todaySales,
  todayOrders,
  todayExpenses,
  lowStockItems,
  clockedInStaff,
}: DashboardClientProps) {
  const todayCOGS = 0
  const grossProfit = todaySales - todayCOGS

  return (
    <AppShell title="Dashboard" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard
            title="Today Sales"
            value={formatCurrency(todaySales)}
            description={`${todayOrders} orders`}
            icon={DollarSign}
            trend="up"
          />
          <StatsCard title="Total Orders" value={todayOrders} description="Today" icon={ShoppingCart} />
          <StatsCard title="COGS" value={formatCurrency(todayCOGS)} description="Cost of goods" icon={Package} />
          <StatsCard
            title="Gross Profit"
            value={formatCurrency(grossProfit)}
            description={`${todaySales > 0 ? ((grossProfit / todaySales) * 100).toFixed(1) : 0}% margin`}
            icon={TrendingUp}
            trend={grossProfit >= 0 ? "up" : "down"}
          />
          <StatsCard
            title="Expenses"
            value={formatCurrency(todayExpenses)}
            description="Today"
            icon={Receipt}
            trend="down"
          />
          <StatsCard title="Staff Present" value={clockedInStaff.length} description="Clocked in" icon={Users} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <LowStockAlert items={lowStockItems} />
            <ClockedInStaff attendance={clockedInStaff} />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>
      </div>
    </AppShell>
  )
}

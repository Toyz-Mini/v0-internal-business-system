"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Clock,
  UserCircle,
  Settings,
  LogOut,
  ChevronDown,
  Wallet,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { UserRole } from "@/lib/types"

interface SidebarProps {
  userRole: UserRole
  userName: string
}

const navigationGroups = {
  menuPos: {
    label: "Menu & POS",
    icon: ShoppingCart,
    roles: ["admin", "cashier"],
    items: [
      { href: "/admin/products", label: "Menu Management", roles: ["admin"] },
      { href: "/admin/categories", label: "Categories", roles: ["admin"] },
      { href: "/admin/modifiers", label: "Modifier Groups", roles: ["admin"] },
      { href: "/pos", label: "POS", roles: ["admin", "cashier"] },
      { href: "/customers", label: "Orders & Customers", roles: ["admin", "cashier"] },
    ],
  },
  operations: {
    label: "Operations",
    icon: Package,
    roles: ["admin", "cashier", "staff"],
    items: [
      { href: "/stock-count", label: "Stock Count", roles: ["admin", "cashier", "staff"] },
      { href: "/inventory", label: "Inventory", roles: ["admin"] },
      { href: "/inventory/purchase-orders", label: "Purchase Orders", roles: ["admin"] },
      { href: "/suppliers", label: "Suppliers", roles: ["admin"] },
    ],
  },
  hrStaff: {
    label: "HR & Staff",
    icon: UserCircle,
    roles: ["admin"],
    items: [
      { href: "/hr/employees", label: "Employee Management", roles: ["admin"] },
      { href: "/hr/attendance", label: "Attendance & OT", roles: ["admin"] },
      { href: "/hr/claims", label: "Claims", roles: ["admin"] },
      { href: "/hr/leave", label: "Leave", roles: ["admin"] },
      { href: "/hr", label: "HR Dashboard", roles: ["admin"] },
    ],
  },
  finance: {
    label: "Finance",
    icon: Wallet,
    roles: ["admin"],
    items: [
      { href: "/expenses", label: "Expenses", roles: ["admin"] },
      { href: "/reports", label: "Reports", roles: ["admin", "cashier"] },
    ],
  },
  system: {
    label: "System",
    icon: Settings,
    roles: ["admin"],
    items: [{ href: "/settings", label: "Settings", roles: ["admin"] }],
  },
}

// Staff-only items (not in collapsible groups)
const staffItems = [{ href: "/attendance", label: "Punch Clock", icon: Clock, roles: ["admin", "cashier", "staff"] }]

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    menuPos: pathname.startsWith("/admin") || pathname.startsWith("/pos") || pathname.startsWith("/customers"),
    operations: pathname.startsWith("/stock") || pathname.startsWith("/inventory") || pathname.startsWith("/suppliers"),
    hrStaff: pathname.startsWith("/hr"),
    finance: pathname.startsWith("/expenses") || pathname.startsWith("/reports"),
    system: pathname.startsWith("/settings"),
  })

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  const isGroupActive = (groupKey: string) => {
    const group = navigationGroups[groupKey as keyof typeof navigationGroups]
    return group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              AB
            </div>
            <span className="font-semibold">AbangBob</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="flex flex-col gap-1">
            {/* Dashboard - always visible */}
            <li>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  pathname === "/dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </li>

            {/* Grouped Navigation */}
            {Object.entries(navigationGroups).map(([key, group]) => {
              // Filter items by role
              const visibleItems = group.items.filter((item) => item.roles.includes(userRole))
              if (visibleItems.length === 0 || !group.roles.includes(userRole)) return null

              const Icon = group.icon
              const isOpen = openGroups[key]
              const isActive = isGroupActive(key)

              return (
                <li key={key} className="mt-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {group.label}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>

                  {/* Group Items */}
                  {isOpen && (
                    <ul className="mt-1 ml-4 space-y-1 border-l pl-3">
                      {visibleItems.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors",
                              pathname === item.href || pathname.startsWith(item.href + "/")
                                ? "bg-muted text-foreground font-medium"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}

            {/* Divider */}
            <li className="my-2 border-t" />

            {/* Staff Items (Punch Clock) */}
            {staffItems
              .filter((item) => item.roles.includes(userRole))
              .map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t p-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}

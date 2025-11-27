"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import type { UserRole } from "@/lib/types"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface AppShellProps {
  children: React.ReactNode
  title?: string
  userRole?: UserRole
  userName?: string
}

export function AppShell({ children, title, userRole: propRole, userName: propName }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>(propRole || "staff")
  const [userName, setUserName] = useState(propName || "User")
  const [loading, setLoading] = useState(!propRole || !propName)

  useEffect(() => {
    // If props are provided, use them
    if (propRole && propName) {
      setUserRole(propRole)
      setUserName(propName)
      setLoading(false)
      return
    }

    // Otherwise fetch user data
    async function fetchUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("users").select("name, role").eq("id", user.id).single()

        if (profile) {
          setUserRole(profile.role as UserRole)
          setUserName(profile.name || user.email || "User")
        }
      }
      setLoading(false)
    }

    fetchUser()
  }, [propRole, propName])

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar userRole={userRole} userName={userName} />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <Header title={title || ""} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { POSLayout } from "@/components/pos/pos-layout"
import { POSGatingBlock } from "@/components/pos/pos-gating-block"
import type { UserRole } from "@/lib/types"

export default async function POSPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: userProfile } = await supabase.from("users").select("*").eq("email", user.email).single()

  const userRole = (userProfile?.role || "staff") as UserRole
  const userName = userProfile?.name || user.email || "User"

  // Check role access
  if (userRole === "staff") {
    redirect("/dashboard")
  }

  const today = new Date().toISOString().split("T")[0]
  const { data: openingCount } = await supabase
    .from("stock_counts")
    .select("id, status")
    .eq("type", "opening")
    .in("status", ["submitted", "approved"])
    .gte("created_at", today)
    .limit(1)
    .single()

  // If no opening count submitted today, show gating block
  if (!openingCount) {
    return (
      <POSGatingBlock
        userRole={userRole}
        userName={userName}
        message="Sila lengkapkan Kiraan Stok Pembukaan untuk outlet ini sebelum buka POS."
      />
    )
  }

  // Fetch categories and products
  const [categoriesResult, productsResult, modifierGroupsResult, customersResult] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("products").select("*, category:categories(*)").eq("is_active", true).order("name"),
    supabase.from("modifier_groups").select("*, modifiers(*)").order("name"),
    supabase.from("customers").select("*").order("name").limit(100),
  ])

  return (
    <POSLayout
      userRole={userRole}
      userName={userName}
      userId={userProfile?.id}
      categories={categoriesResult.data || []}
      products={productsResult.data || []}
      modifierGroups={modifierGroupsResult.data || []}
      customers={customersResult.data || []}
    />
  )
}

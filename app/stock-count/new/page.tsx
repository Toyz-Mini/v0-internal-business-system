"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { StockCountForm } from "@/components/stock-count/stock-count-form"
import { Loader2 } from "lucide-react"
import type { Ingredient, StockCount, User } from "@/lib/types"

function NewStockCountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const countType = (searchParams.get("type") || "opening") as "opening" | "closing"

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [existingCount, setExistingCount] = useState<StockCount | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()
        setCurrentUser(userData)
      }

      // Check for existing draft today
      const today = new Date().toISOString().split("T")[0]
      const { data: draftData } = await supabase
        .from("stock_counts")
        .select("*, items:stock_count_items(*)")
        .eq("type", countType)
        .eq("status", "draft")
        .gte("created_at", today)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (draftData) {
        setExistingCount(draftData)
      }

      // Get all active ingredients
      const { data: ingredientsData } = await supabase
        .from("ingredients")
        .select("*")
        .eq("is_active", true)
        .order("name")
      setIngredients(ingredientsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <StockCountForm
        type={countType}
        ingredients={ingredients}
        currentUser={currentUser}
        existingCount={existingCount}
        onComplete={() => router.push("/stock-count")}
        onCancel={() => router.back()}
      />
    </AppShell>
  )
}

export default function NewStockCountPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </AppShell>
      }
    >
      <NewStockCountContent />
    </Suspense>
  )
}

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { ingredientId } = body

    if (ingredientId) {
      // Recompute single ingredient
      const { error } = await supabase.rpc("update_ingredient_stock", {
        p_ingredient_id: ingredientId,
      })

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: "Stock recomputed successfully",
      })
    } else {
      // Recompute all ingredients
      const { data: ingredients } = await supabase.from("ingredients").select("id")

      if (!ingredients) {
        return NextResponse.json({ error: "No ingredients found" }, { status: 404 })
      }

      for (const ingredient of ingredients) {
        await supabase.rpc("update_ingredient_stock", {
          p_ingredient_id: ingredient.id,
        })
      }

      return NextResponse.json({
        success: true,
        message: `Recomputed ${ingredients.length} ingredients`,
      })
    }
  } catch (error) {
    console.error("Recompute error:", error)
    return NextResponse.json({ error: "Failed to recompute stock" }, { status: 500 })
  }
}

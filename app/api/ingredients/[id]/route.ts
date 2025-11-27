import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { inventoryService } from "@/lib/services/inventory"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const ingredient = await inventoryService.getById(id)

    return NextResponse.json({ data: ingredient })
  } catch (error: any) {
    console.error("[API] Get ingredient error:", error)

    if (error.message === "Ingredient not found") {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch ingredient" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const ingredient = await inventoryService.update(id, body)

    return NextResponse.json({ data: ingredient })
  } catch (error: any) {
    console.error("[API] Update ingredient error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update ingredient" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { id } = await params

    await inventoryService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete ingredient error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete ingredient" }, { status: 500 })
  }
}

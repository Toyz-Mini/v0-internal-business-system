import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { expenseService } from "@/lib/services/expenses"

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

    const expense = await expenseService.getById(id)

    return NextResponse.json({ data: expense })
  } catch (error: any) {
    console.error("[API] Get expense error:", error)

    if (error.message === "Expense not found") {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch expense" }, { status: 500 })
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

    const { id } = await params
    const body = await request.json()

    const expense = await expenseService.update(id, body)

    return NextResponse.json({ data: expense })
  } catch (error: any) {
    console.error("[API] Update expense error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update expense" }, { status: 500 })
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

    await expenseService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete expense error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete expense" }, { status: 500 })
  }
}

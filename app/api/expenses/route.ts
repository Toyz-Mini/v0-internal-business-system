import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { expenseService } from "@/lib/services/expenses"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const filters = {
      category: searchParams.get("category") || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
    }

    const expenses = await expenseService.list(filters)

    return NextResponse.json({ data: expenses })
  } catch (error: any) {
    console.error("[API] Get expenses error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch expenses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const expense = await expenseService.create(body, user.id)

    return NextResponse.json({ data: expense }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create expense error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create expense" }, { status: 500 })
  }
}

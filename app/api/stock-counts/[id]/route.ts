import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { stockCountService } from "@/lib/services/stock-counts"

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

    const stockCount = await stockCountService.getById(id)

    return NextResponse.json({ data: stockCount })
  } catch (error: any) {
    console.error("[API] Get stock count error:", error)

    if (error.message === "Stock count not found") {
      return NextResponse.json({ error: "Stock count not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch stock count" }, { status: 500 })
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

    const stockCount = await stockCountService.update(id, body)

    return NextResponse.json({ data: stockCount })
  } catch (error: any) {
    console.error("[API] Update stock count error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update stock count" }, { status: 500 })
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

    await stockCountService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete stock count error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete stock count" }, { status: 500 })
  }
}

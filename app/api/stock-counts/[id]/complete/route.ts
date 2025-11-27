import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { stockCountService } from "@/lib/services/stock-counts"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const stockCount = await stockCountService.complete(id, user.id)

    return NextResponse.json({ data: stockCount })
  } catch (error: any) {
    console.error("[API] Complete stock count error:", error)
    return NextResponse.json({ error: error?.message || "Failed to complete stock count" }, { status: 500 })
  }
}

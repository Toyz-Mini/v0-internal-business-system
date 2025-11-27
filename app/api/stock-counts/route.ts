import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { stockCountService } from "@/lib/services/stock-counts"

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
      status: searchParams.get("status") || undefined,
    }

    const stockCounts = await stockCountService.list(filters)

    return NextResponse.json({ data: stockCounts })
  } catch (error: any) {
    console.error("[API] Get stock counts error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch stock counts" }, { status: 500 })
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

    const stockCount = await stockCountService.create(body, user.id)

    return NextResponse.json({ data: stockCount }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create stock count error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create stock count" }, { status: 500 })
  }
}

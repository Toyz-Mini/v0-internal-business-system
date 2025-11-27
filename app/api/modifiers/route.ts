import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { modifierService } from "@/lib/services/modifiers"

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
      product_id: searchParams.get("product_id") || undefined,
      is_active: searchParams.get("is_active") !== "false",
    }

    const groups = await modifierService.listGroups(filters)

    return NextResponse.json({ data: groups })
  } catch (error: any) {
    console.error("[API] Get modifier groups error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch modifier groups" }, { status: 500 })
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

    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()

    const group = await modifierService.createGroup(body)

    return NextResponse.json({ data: group }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create modifier group error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create modifier group" }, { status: 500 })
  }
}

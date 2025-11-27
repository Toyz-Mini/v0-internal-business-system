import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { modifierService } from "@/lib/services/modifiers"

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

    const group = await modifierService.getGroupById(id)

    return NextResponse.json({ data: group })
  } catch (error: any) {
    console.error("[API] Get modifier group error:", error)

    if (error.message === "Modifier group not found") {
      return NextResponse.json({ error: "Modifier group not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch modifier group" }, { status: 500 })
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

    const group = await modifierService.updateGroup(id, body)

    return NextResponse.json({ data: group })
  } catch (error: any) {
    console.error("[API] Update modifier group error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update modifier group" }, { status: 500 })
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

    await modifierService.deleteGroup(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete modifier group error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete modifier group" }, { status: 500 })
  }
}

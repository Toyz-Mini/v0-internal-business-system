import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { supplierService } from "@/lib/services/suppliers"

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

    const supplier = await supplierService.getById(id)

    return NextResponse.json({ data: supplier })
  } catch (error: any) {
    console.error("[API] Get supplier error:", error)

    if (error.message === "Supplier not found") {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch supplier" }, { status: 500 })
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

    const supplier = await supplierService.update(id, body)

    return NextResponse.json({ data: supplier })
  } catch (error: any) {
    console.error("[API] Update supplier error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update supplier" }, { status: 500 })
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

    await supplierService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete supplier error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete supplier" }, { status: 500 })
  }
}

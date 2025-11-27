import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { customerService } from "@/lib/services/customers"
import { updateCustomerSchema } from "@/lib/validation/customers"
import { z } from "zod"

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

    const customer = await customerService.getById(id)

    return NextResponse.json({ data: customer })
  } catch (error: any) {
    console.error("[API] Get customer error:", error)

    if (error.message === "Customer not found") {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch customer" }, { status: 500 })
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

    const validated = updateCustomerSchema.parse(body)

    const customer = await customerService.update(id, validated)

    return NextResponse.json({ data: customer })
  } catch (error: any) {
    console.error("[API] Update customer error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error?.message || "Failed to update customer" }, { status: 500 })
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

    await customerService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete customer error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete customer" }, { status: 500 })
  }
}

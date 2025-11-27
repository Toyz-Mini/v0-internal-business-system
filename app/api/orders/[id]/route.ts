import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { orderService } from "@/lib/services/orders"
import { updateOrderStatusSchema } from "@/lib/validation/orders"
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

    const order = await orderService.getById(id)

    return NextResponse.json({ data: order })
  } catch (error: any) {
    console.error("[API] Get order error:", error)

    if (error.message === "Order not found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch order" }, { status: 500 })
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

    const validated = updateOrderStatusSchema.parse(body)

    const order = await orderService.updateStatus(id, validated.status)

    return NextResponse.json({ data: order })
  } catch (error: any) {
    console.error("[API] Update order error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error?.message || "Failed to update order" }, { status: 500 })
  }
}

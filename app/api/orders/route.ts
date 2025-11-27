import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { orderService } from "@/lib/services/orders"
import { createOrderSchema } from "@/lib/validation/orders"
import { z } from "zod"

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
      customer_id: searchParams.get("customer_id") || undefined,
      payment_status: searchParams.get("payment_status") || undefined,
      payment_method: searchParams.get("payment_method") || undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
    }

    const orders = await orderService.list(filters)

    return NextResponse.json({ data: orders })
  } catch (error: any) {
    console.error("[API] Get orders error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch orders" }, { status: 500 })
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

    const validated = createOrderSchema.parse(body)

    const order = await orderService.create(validated, user.id)

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create order error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error?.message || "Failed to create order" }, { status: 500 })
  }
}

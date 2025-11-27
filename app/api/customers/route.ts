import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { customerService } from "@/lib/services/customers"
import { createCustomerSchema } from "@/lib/validation/customers"
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
      search: searchParams.get("search") || undefined,
    }

    const customers = await customerService.list(filters)

    return NextResponse.json({ data: customers })
  } catch (error: any) {
    console.error("[API] Get customers error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch customers" }, { status: 500 })
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

    const validated = createCustomerSchema.parse(body)

    const customer = await customerService.create(validated)

    return NextResponse.json({ data: customer }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create customer error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: error?.message || "Failed to create customer" }, { status: 500 })
  }
}

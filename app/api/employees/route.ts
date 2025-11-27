import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { employeeService } from "@/lib/services/employees"

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
      position: searchParams.get("position") || undefined,
      is_active: searchParams.get("is_active") !== "false",
    }

    const employees = await employeeService.list(filters)

    return NextResponse.json({ data: employees })
  } catch (error: any) {
    console.error("[API] Get employees error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch employees" }, { status: 500 })
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

    const employee = await employeeService.create(body)

    return NextResponse.json({ data: employee }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create employee error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create employee" }, { status: 500 })
  }
}

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { employeeService } from "@/lib/services/employees"

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

    const employee = await employeeService.getById(id)

    return NextResponse.json({ data: employee })
  } catch (error: any) {
    console.error("[API] Get employee error:", error)

    if (error.message === "Employee not found") {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ error: error?.message || "Failed to fetch employee" }, { status: 500 })
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

    const employee = await employeeService.update(id, body)

    return NextResponse.json({ data: employee })
  } catch (error: any) {
    console.error("[API] Update employee error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update employee" }, { status: 500 })
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

    await employeeService.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete employee error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete employee" }, { status: 500 })
  }
}

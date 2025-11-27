import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("leave_applications")
      .select(
        `
        *,
        employee:employees(id, full_name, position, phone, email),
        approver:users!leave_applications_approved_by_fkey(id, full_name)
      `,
      )
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: "Leave application not found" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("[API] Get leave application error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch leave application" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { status, rejection_reason } = body

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be 'approved' or 'rejected'" }, { status: 400 })
    }

    if (status === "rejected" && !rejection_reason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
    }

    // Update leave application
    const updateData: any = {
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }

    if (status === "rejected") {
      updateData.rejection_reason = rejection_reason
    }

    const { data, error} = await supabase.from("leave_applications").update(updateData).eq("id", id).select().single()

    if (error) throw error

    // Note: Leave balance deduction is handled automatically by database trigger

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("[API] Update leave application error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update leave application" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { error } = await supabase.from("leave_applications").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API] Delete leave application error:", error)
    return NextResponse.json({ error: error?.message || "Failed to delete leave application" }, { status: 500 })
  }
}

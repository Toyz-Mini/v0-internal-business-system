import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from("claims")
      .select(
        `
        *,
        employee:employees(id, name, position),
        approver:users!claims_approved_by_fkey(id, name)
      `,
      )
      .order("claim_date", { ascending: false })

    // Filters
    const status = searchParams.get("status")
    const employeeId = searchParams.get("employee_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    if (status) {
      query = query.eq("status", status)
    }

    if (employeeId) {
      query = query.eq("employee_id", employeeId)
    }

    if (startDate) {
      query = query.gte("claim_date", startDate)
    }

    if (endDate) {
      query = query.lte("claim_date", endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("[API] Get claims error:", error)
    return NextResponse.json({ error: error?.message || "Failed to fetch claims" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { employee_id, claim_type, claim_date, distance_km, amount, place_route, attachment_url, notes } = body

    // Validation
    if (!employee_id || !claim_type || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (claim_type === "mileage" && !distance_km) {
      return NextResponse.json({ error: "Distance is required for mileage claims" }, { status: 400 })
    }

    // Insert claim
    const { data, error } = await supabase
      .from("claims")
      .insert({
        employee_id,
        claim_type,
        claim_date: claim_date || new Date().toISOString().split("T")[0],
        distance_km: claim_type === "mileage" ? distance_km : null,
        amount: Number.parseFloat(amount),
        place_route,
        attachment_url,
        notes,
        status: "pending",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error("[API] Create claim error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create claim" }, { status: 500 })
  }
}

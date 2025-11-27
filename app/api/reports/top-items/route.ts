import { NextResponse } from "next/server"
import { ReportService } from "@/services/report.service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")
    const limitParam = searchParams.get("limit") || "5"

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ success: false, error: "start_date and end_date required" }, { status: 400 })
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)
    const limit = parseInt(limitParam, 10)

    const data = await ReportService.getTopItems(startDate, endDate, limit)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("Error fetching top items:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mendapatkan item popular",
      },
      { status: 500 },
    )
  }
}

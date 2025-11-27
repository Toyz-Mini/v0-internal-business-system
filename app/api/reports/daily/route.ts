import { NextResponse } from "next/server"
import { ReportService } from "@/services/report.service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("start_date")
    const endDateParam = searchParams.get("end_date")

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ success: false, error: "start_date and end_date required" }, { status: 400 })
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)

    const data = await ReportService.getDailyStats(startDate, endDate)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("Error fetching daily report:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mendapatkan laporan harian",
      },
      { status: 500 },
    )
  }
}

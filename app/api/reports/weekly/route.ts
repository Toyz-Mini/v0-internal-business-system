import { NextResponse } from "next/server"
import { ReportService } from "@/services/report.service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get("week_start")

    if (!weekStartParam) {
      return NextResponse.json({ success: false, error: "week_start required" }, { status: 400 })
    }

    const weekStart = new Date(weekStartParam)
    const data = await ReportService.getWeeklySummary(weekStart)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("Error fetching weekly report:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mendapatkan laporan mingguan",
      },
      { status: 500 },
    )
  }
}

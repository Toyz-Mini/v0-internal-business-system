import { NextResponse } from "next/server"
import { ReportService } from "@/services/report.service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const monthStartParam = searchParams.get("month_start")

    if (!monthStartParam) {
      return NextResponse.json({ success: false, error: "month_start required" }, { status: 400 })
    }

    const monthStart = new Date(monthStartParam)
    const data = await ReportService.getMonthlySummary(monthStart)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("Error fetching monthly report:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mendapatkan laporan bulanan",
      },
      { status: 500 },
    )
  }
}

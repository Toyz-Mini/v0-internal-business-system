"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Employee, Attendance } from "@/lib/types"

interface AttendanceReportDialogProps {
  employees: Employee[]
}

interface ReportData {
  employee: Employee
  totalDays: number
  totalHours: number
  workingHours: number
  overtimeHours: number
  otPay: number
  lateDays: number
  baseSalary: number
  estimatedSalary: number
}

export function AttendanceReportDialog({ employees }: AttendanceReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all")
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0])
  const [reportData, setReportData] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [otRateMultiplier, setOtRateMultiplier] = useState(1.5)

  const generateReport = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data: settingsData } = await supabase.from("settings").select("ot_rate_multiplier").single()
      const otRate = settingsData?.ot_rate_multiplier ?? 1.5
      setOtRateMultiplier(otRate)

      let query = supabase
        .from("attendance")
        .select("*, employee:employees(*)")
        .gte("clock_in", `${startDate}T00:00:00`)
        .lte("clock_in", `${endDate}T23:59:59`)
        .not("clock_out", "is", null)

      if (selectedEmployee !== "all") {
        query = query.eq("employee_id", selectedEmployee)
      }

      const { data: attendance } = await query

      if (!attendance) {
        setReportData([])
        return
      }

      // Group by employee
      const grouped = attendance.reduce(
        (acc, record) => {
          const empId = record.employee_id
          if (!acc[empId]) {
            acc[empId] = {
              employee: record.employee,
              records: [],
            }
          }
          acc[empId].records.push(record)
          return acc
        },
        {} as Record<string, { employee: Employee; records: Attendance[] }>,
      )

      const report: ReportData[] = Object.values(grouped).map(({ employee, records }) => {
        const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0)
        const workingHours = records.reduce((sum, r) => sum + (r.working_hours || 0), 0)
        const overtimeHours = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0)
        const lateDays = records.filter((r) => r.is_late).length

        let baseSalary = 0
        let otPay = 0
        let estimatedSalary = 0

        if (employee.salary_type === "hourly") {
          // Hourly: Base pay for working hours + OT premium
          baseSalary = workingHours * employee.salary_rate
          otPay = overtimeHours * employee.salary_rate * otRate
          estimatedSalary = baseSalary + otPay
        } else {
          // Monthly: Calculate based on days worked
          const workingDaysInMonth = 22
          const dailyRate = employee.salary_rate / workingDaysInMonth
          baseSalary = records.length * dailyRate

          // OT pay for monthly employees (based on hourly equivalent)
          const monthlyHours = workingDaysInMonth * 8 // 8 hours/day
          const hourlyEquivalent = employee.salary_rate / monthlyHours
          otPay = overtimeHours * hourlyEquivalent * otRate

          estimatedSalary = baseSalary + otPay
        }

        return {
          employee,
          totalDays: records.length,
          totalHours,
          workingHours,
          overtimeHours,
          otPay,
          lateDays,
          baseSalary,
          estimatedSalary,
        }
      })

      setReportData(report)
    } catch (error) {
      console.error("Error generating report:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportCSV = () => {
    const headers = [
      "Employee",
      "Position",
      "Days Worked",
      "Total Hours",
      "Working Hours",
      "OT Hours",
      "Late Days",
      "Base Salary",
      "OT Pay",
      "Total Salary",
    ]
    const rows = reportData.map((r) => [
      r.employee.name,
      r.employee.position,
      r.totalDays,
      r.totalHours.toFixed(2),
      r.workingHours.toFixed(2),
      r.overtimeHours.toFixed(2),
      r.lateDays,
      r.baseSalary.toFixed(2),
      r.otPay.toFixed(2),
      r.estimatedSalary.toFixed(2),
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payroll-report-${startDate}-${endDate}.csv`
    a.click()
  }

  const totalBaseSalary = reportData.reduce((sum, r) => sum + r.baseSalary, 0)
  const totalOTPay = reportData.reduce((sum, r) => sum + r.otPay, 0)
  const totalSalary = reportData.reduce((sum, r) => sum + r.estimatedSalary, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Payroll Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Payroll Report (Duration-Based OT)</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 py-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={generateReport} disabled={isLoading} className="w-full">
              {isLoading ? "Loading..." : "Generate"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {reportData.length > 0 ? (
            <>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-900">OT Rate: {otRateMultiplier}x</p>
                <p className="text-blue-800">
                  Working Hours = (Clock Out - Clock In) - Break | OT = max(0, Working Hours - 8)
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Total Hrs</TableHead>
                    <TableHead>Work Hrs</TableHead>
                    <TableHead>OT Hrs</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Base Pay</TableHead>
                    <TableHead>OT Pay</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((r) => (
                    <TableRow key={r.employee.id}>
                      <TableCell className="font-medium">{r.employee.name}</TableCell>
                      <TableCell>{r.employee.position}</TableCell>
                      <TableCell>{r.totalDays}</TableCell>
                      <TableCell>{r.totalHours.toFixed(1)}</TableCell>
                      <TableCell>{r.workingHours.toFixed(1)}</TableCell>
                      <TableCell className="text-orange-600 font-medium">{r.overtimeHours.toFixed(1)}</TableCell>
                      <TableCell>{r.lateDays}</TableCell>
                      <TableCell>BND {r.baseSalary.toFixed(2)}</TableCell>
                      <TableCell className="text-orange-600 font-medium">BND {r.otPay.toFixed(2)}</TableCell>
                      <TableCell className="font-bold">BND {r.estimatedSalary.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={7}>TOTAL</TableCell>
                    <TableCell>BND {totalBaseSalary.toFixed(2)}</TableCell>
                    <TableCell className="text-orange-600">BND {totalOTPay.toFixed(2)}</TableCell>
                    <TableCell>BND {totalSalary.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Click Generate to view report</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

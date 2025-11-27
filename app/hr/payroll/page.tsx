"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, Download, FileText } from "lucide-react"
import { toast } from "sonner"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { AppShell } from "@/components/layout/app-shell"

interface Employee {
  id: string
  name: string
  position: string
  salary_type: string // 'hourly' or 'monthly'
  salary_rate: number
  is_active: boolean
}

interface PayrollSummary {
  employee_id: string
  employee_name: string
  position: string
  salary_type: string
  total_hours: number
  total_ot_hours: number
  base_salary: number
  ot_pay: number
  total_salary: number
  status: "pending" | "processed" | "paid"
}

function calculateHourlyRate(salaryType: string, salaryRate: number): number {
  if (salaryType === "hourly") {
    return salaryRate
  }
  // For monthly salary, assume 160 working hours per month (8h x 20 days)
  return salaryRate / 160
}

function calculateOTRate(hourlyRate: number): number {
  return hourlyRate * 1.5
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrollData, setPayrollData] = useState<PayrollSummary[]>([])
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"))
  const [loading, setLoading] = useState(true)
  const [processingPayroll, setProcessingPayroll] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    if (employees.length > 0) {
      loadPayrollData()
    }
  }, [selectedMonth, employees])

  async function loadEmployees() {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, position, salary_type, salary_rate, is_active")
        .eq("is_active", true)
        .order("name")

      if (error) throw error

      setEmployees(data || [])
    } catch (error: any) {
      toast.error(error?.message || "Failed to load employees")
      console.error("[v0] Load employees error:", error)
    }
  }

  async function loadPayrollData() {
    setLoading(true)

    const [year, month] = selectedMonth.split("-")
    const startDate = startOfMonth(new Date(Number.parseInt(year), Number.parseInt(month) - 1))
    const endDate = endOfMonth(new Date(Number.parseInt(year), Number.parseInt(month) - 1))

    try {
      const { data: attendanceData, error } = await supabase
        .from("attendance")
        .select(`
          employee_id,
          clock_in,
          clock_out,
          total_hours,
          ot_hours
        `)
        .gte("clock_in", startDate.toISOString())
        .lte("clock_in", endDate.toISOString())
        .not("clock_out", "is", null)

      if (error) throw error

      const summary = new Map<string, PayrollSummary>()

      attendanceData?.forEach((record: any) => {
        const empId = record.employee_id
        const existing = summary.get(empId)

        const recordHours = Number(record.total_hours) || 0
        const recordOtHours = Number(record.ot_hours) || 0

        if (existing) {
          existing.total_hours += recordHours
          existing.total_ot_hours += recordOtHours
        } else {
          const employee = employees.find((e) => e.id === empId)
          if (!employee) return

          const hourlyRate = calculateHourlyRate(employee.salary_type, employee.salary_rate)
          const otRate = calculateOTRate(hourlyRate)

          let baseSalary = 0
          if (employee.salary_type === "monthly") {
            baseSalary = employee.salary_rate
          } else {
            baseSalary = recordHours * hourlyRate
          }
          const otPay = recordOtHours * otRate

          summary.set(empId, {
            employee_id: empId,
            employee_name: employee.name || "Unknown",
            position: employee.position || "N/A",
            salary_type: employee.salary_type || "monthly",
            total_hours: recordHours,
            total_ot_hours: recordOtHours,
            base_salary: baseSalary,
            ot_pay: otPay,
            total_salary: baseSalary + otPay,
            status: "pending",
          })
        }
      })

      summary.forEach((value) => {
        const emp = employees.find((e) => e.id === value.employee_id)
        if (!emp) return

        const hourlyRate = calculateHourlyRate(emp.salary_type, emp.salary_rate)
        const otRate = calculateOTRate(hourlyRate)

        if (emp.salary_type === "monthly") {
          value.base_salary = emp.salary_rate
        } else {
          value.base_salary = value.total_hours * hourlyRate
        }
        value.ot_pay = value.total_ot_hours * otRate
        value.total_salary = value.base_salary + value.ot_pay
      })

      setPayrollData(Array.from(summary.values()))
    } catch (error: any) {
      const errorMessage = error?.message || error?.details || JSON.stringify(error)
      toast.error(`Failed to load payroll data: ${errorMessage}`)
      console.error("[v0] Load payroll error:", error)
    } finally {
      setLoading(false)
    }
  }

  function handleMonthChange(value: string) {
    setSelectedMonth(value)
  }

  function generateMonthOptions() {
    const options = []
    const currentDate = new Date()

    for (let i = 0; i < 12; i++) {
      const date = subMonths(currentDate, i)
      const value = format(date, "yyyy-MM")
      const label = format(date, "MMMM yyyy")
      options.push({ value, label })
    }

    return options
  }

  async function processPayroll() {
    setProcessingPayroll(true)

    try {
      toast.success("Payroll processed successfully")
      await loadPayrollData()
    } catch (error: any) {
      toast.error(error?.message || "Failed to process payroll")
      console.error("[v0] Process payroll error:", error)
    } finally {
      setProcessingPayroll(false)
    }
  }

  function exportPayroll() {
    try {
      const csv = [
        ["Employee Name", "Position", "Salary Type", "Hours", "OT Hours", "Base Salary", "OT Pay", "Total Salary"].join(
          ",",
        ),
        ...payrollData.map((row) =>
          [
            `"${row.employee_name}"`,
            `"${row.position}"`,
            row.salary_type,
            row.total_hours.toFixed(2),
            row.total_ot_hours.toFixed(2),
            `BND ${row.base_salary.toFixed(2)}`,
            `BND ${row.ot_pay.toFixed(2)}`,
            `BND ${row.total_salary.toFixed(2)}`,
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `payroll-${selectedMonth}.csv`
      a.click()
      toast.success("Payroll exported successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to export payroll")
      console.error("[v0] Export error:", error)
    }
  }

  const totalPayroll = payrollData.reduce((sum, row) => sum + (Number(row.total_salary) || 0), 0)
  const totalHours = payrollData.reduce((sum, row) => sum + (Number(row.total_hours) || 0), 0)
  const totalOTHours = payrollData.reduce((sum, row) => sum + (Number(row.total_ot_hours) || 0), 0)

  return (
    <AppShell title="Salary & Payroll">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Salary & Payroll</h1>
            <p className="text-muted-foreground">Manage employee salaries and payroll processing</p>
          </div>
          <div className="flex justify-center md:justify-end">
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">BND {totalPayroll.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{payrollData.length} employees</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground mt-1">Regular hours worked</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OT Hours</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOTHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground mt-1">Overtime hours</p>
            </CardContent>
          </Card>

          <Card className="rounded-lg shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge variant="secondary">Pending</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Payroll Summary</CardTitle>
                <CardDescription className="mt-1">
                  Salary breakdown for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={exportPayroll} className="w-full sm:w-auto bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button onClick={processPayroll} disabled={processingPayroll} className="w-full sm:w-auto">
                  {processingPayroll ? "Processing..." : "Process Payroll"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading payroll data...</p>
                </div>
              </div>
            ) : payrollData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground font-medium">No attendance records found</p>
                  <p className="text-sm text-muted-foreground">Try selecting a different month</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">Position</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="text-right font-semibold">Hours</TableHead>
                      <TableHead className="text-right font-semibold">OT Hours</TableHead>
                      <TableHead className="text-right font-semibold">Base Salary</TableHead>
                      <TableHead className="text-right font-semibold">OT Pay</TableHead>
                      <TableHead className="text-right font-semibold">Total Salary</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData.map((row) => (
                      <TableRow key={row.employee_id}>
                        <TableCell className="font-medium">{row.employee_name}</TableCell>
                        <TableCell className="text-muted-foreground">{row.position}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {row.salary_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.total_hours.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{row.total_ot_hours.toFixed(2)}</TableCell>
                        <TableCell className="text-right">BND {row.base_salary.toFixed(2)}</TableCell>
                        <TableCell className="text-right">BND {row.ot_pay.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          BND {row.total_salary.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

import { createClient } from "@/lib/supabase/server"

export interface AttendanceFilters {
  employee_id?: string
  date_from?: string
  date_to?: string
}

export interface ClockInData {
  employee_id: string
  clock_in_lat?: number
  clock_in_lng?: number
}

export interface ClockOutData {
  clock_out_lat?: number
  clock_out_lng?: number
}

export class AttendanceService {
  calculateHours(clockIn: string, clockOut: string) {
    const start = new Date(clockIn)
    const end = new Date(clockOut)
    const diff = end.getTime() - start.getTime()
    return Number((diff / (1000 * 60 * 60)).toFixed(2))
  }

  calculateOvertimeHours(totalHours: number, standardHours = 8) {
    if (totalHours > standardHours) {
      return Number((totalHours - standardHours).toFixed(2))
    }
    return 0
  }

  async list(filters: AttendanceFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("attendance")
      .select(`
        *,
        employee:employees(id, name, position)
      `)
      .order("date", { ascending: false })
      .order("clock_in", { ascending: false })

    if (filters.employee_id) {
      query = query.eq("employee_id", filters.employee_id)
    }

    if (filters.date_from) {
      query = query.gte("date", filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte("date", filters.date_to)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("attendance")
      .select(`
        *,
        employee:employees(id, name, position, phone)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Attendance record not found")
    }

    return data
  }

  async getActiveAttendance(employeeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return data
  }

  async clockIn(data: ClockInData) {
    const supabase = await createClient()

    const existingAttendance = await this.getActiveAttendance(data.employee_id)

    if (existingAttendance) {
      throw new Error("Employee is already clocked in. Please clock out first.")
    }

    const now = new Date()
    const date = now.toISOString().split("T")[0]

    const { data: attendance, error } = await supabase
      .from("attendance")
      .insert({
        employee_id: data.employee_id,
        clock_in: now.toISOString(),
        clock_in_lat: data.clock_in_lat || null,
        clock_in_lng: data.clock_in_lng || null,
        date,
      })
      .select(`
        *,
        employee:employees(id, name, position)
      `)
      .single()

    if (error) throw error

    return attendance
  }

  async clockOut(employeeId: string, data: ClockOutData) {
    const supabase = await createClient()

    const attendance = await this.getActiveAttendance(employeeId)

    if (!attendance) {
      throw new Error("No active clock-in found for this employee")
    }

    const now = new Date()
    const totalHours = this.calculateHours(attendance.clock_in, now.toISOString())
    const otHours = this.calculateOvertimeHours(totalHours)

    const { data: updatedAttendance, error } = await supabase
      .from("attendance")
      .update({
        clock_out: now.toISOString(),
        clock_out_lat: data.clock_out_lat || null,
        clock_out_lng: data.clock_out_lng || null,
        total_hours: totalHours,
        ot_hours: otHours,
        overtime_hours: otHours,
      })
      .eq("id", attendance.id)
      .select(`
        *,
        employee:employees(id, name, position)
      `)
      .single()

    if (error) throw error

    return updatedAttendance
  }

  async update(id: string, data: any) {
    const supabase = await createClient()

    const { data: attendance, error } = await supabase
      .from("attendance")
      .update(data)
      .eq("id", id)
      .select(`
        *,
        employee:employees(id, name, position)
      `)
      .single()

    if (error) throw error

    return attendance
  }

  async getSummary(employeeId: string, month: string) {
    const supabase = await createClient()

    const [year, monthNum] = month.split("-")
    const startDate = `${year}-${monthNum}-01`
    const endDate = new Date(Number.parseInt(year), Number.parseInt(monthNum), 0).toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("date", startDate)
      .lte("date", endDate)
      .not("clock_out", "is", null)

    if (error) throw error

    const totalDays = data?.length || 0
    const totalHours = data?.reduce((sum, att) => sum + (Number(att.total_hours) || 0), 0) || 0
    const totalOtHours = data?.reduce((sum, att) => sum + (Number(att.ot_hours) || 0), 0) || 0
    const lateDays = data?.filter((att) => att.is_late).length || 0

    return {
      employee_id: employeeId,
      month,
      total_days: totalDays,
      total_hours: Number(totalHours.toFixed(2)),
      total_ot_hours: Number(totalOtHours.toFixed(2)),
      late_days: lateDays,
      records: data,
    }
  }
}

export const attendanceService = new AttendanceService()

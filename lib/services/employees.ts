import { createClient } from "@/lib/supabase/server"

export interface EmployeeFilters {
  search?: string
  position?: string
  is_active?: boolean
}

export interface CreateEmployeeData {
  full_name: string
  email?: string
  phone?: string
  position?: string
  department?: string
  salary?: number
  hire_date?: string
  is_active?: boolean
}

export interface UpdateEmployeeData {
  full_name?: string
  email?: string
  phone?: string
  position?: string
  department?: string
  salary?: number
  hire_date?: string
  is_active?: boolean
}

export class EmployeeService {
  async list(filters: EmployeeFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("employees")
      .select("*")
      .order("full_name")

    if (filters.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }

    if (filters.position) {
      query = query.eq("position", filters.position)
    }

    if (filters.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Employee not found")
    }

    return data
  }

  async create(data: CreateEmployeeData) {
    const supabase = await createClient()

    const { data: employee, error } = await supabase
      .from("employees")
      .insert({
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        position: data.position || null,
        department: data.department || null,
        salary: data.salary || 0,
        hire_date: data.hire_date || new Date().toISOString().split("T")[0],
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select()
      .single()

    if (error) throw error

    return employee
  }

  async update(id: string, data: UpdateEmployeeData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.full_name !== undefined) updateData.full_name = data.full_name
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.position !== undefined) updateData.position = data.position
    if (data.department !== undefined) updateData.department = data.department
    if (data.salary !== undefined) updateData.salary = data.salary
    if (data.hire_date !== undefined) updateData.hire_date = data.hire_date
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: employee, error } = await supabase
      .from("employees")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return employee
  }

  async delete(id: string) {
    const supabase = await createClient()

    const { data: attendance } = await supabase
      .from("attendance")
      .select("id")
      .eq("employee_id", id)
      .limit(1)

    if (attendance && attendance.length > 0) {
      throw new Error("Cannot delete employee with attendance records. Please deactivate instead.")
    }

    const { error } = await supabase.from("employees").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }

  async getAttendanceSummary(employeeId: string, month: string) {
    const supabase = await createClient()

    const [year, monthNum] = month.split("-")
    const startDate = `${year}-${monthNum}-01`
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate()
    const endDate = `${year}-${monthNum}-${lastDay}`

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

    return {
      total_days: totalDays,
      total_hours: Number(totalHours.toFixed(2)),
      total_ot_hours: Number(totalOtHours.toFixed(2)),
      records: data,
    }
  }
}

export const employeeService = new EmployeeService()

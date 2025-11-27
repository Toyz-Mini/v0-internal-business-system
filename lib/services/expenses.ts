import { createClient } from "@/lib/supabase/server"

export interface ExpenseFilters {
  category?: string
  date_from?: string
  date_to?: string
}

export interface CreateExpenseData {
  category: string
  amount: number
  description?: string
  date?: string
  receipt_url?: string
  notes?: string
}

export interface UpdateExpenseData {
  category?: string
  amount?: number
  description?: string
  date?: string
  receipt_url?: string
  notes?: string
}

export class ExpenseService {
  async list(filters: ExpenseFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })

    if (filters.category) {
      query = query.eq("category", filters.category)
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
      .from("expenses")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Expense not found")
    }

    return data
  }

  async create(data: CreateExpenseData, userId: string) {
    const supabase = await createClient()

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        category: data.category,
        amount: data.amount,
        description: data.description || null,
        date: data.date || new Date().toISOString().split("T")[0],
        receipt_url: data.receipt_url || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw error

    return expense
  }

  async update(id: string, data: UpdateExpenseData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.category !== undefined) updateData.category = data.category
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.description !== undefined) updateData.description = data.description
    if (data.date !== undefined) updateData.date = data.date
    if (data.receipt_url !== undefined) updateData.receipt_url = data.receipt_url
    if (data.notes !== undefined) updateData.notes = data.notes

    const { data: expense, error } = await supabase
      .from("expenses")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return expense
  }

  async delete(id: string) {
    const supabase = await createClient()

    const { error } = await supabase.from("expenses").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }

  async getSummary(filters: ExpenseFilters = {}) {
    const supabase = await createClient()

    let query = supabase.from("expenses").select("category, amount")

    if (filters.date_from) {
      query = query.gte("date", filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte("date", filters.date_to)
    }

    const { data, error } = await query

    if (error) throw error

    const totalExpenses = data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

    const byCategory = data?.reduce((acc: any, exp) => {
      const cat = exp.category || "Uncategorized"
      acc[cat] = (acc[cat] || 0) + Number(exp.amount)
      return acc
    }, {})

    return {
      total_expenses: Number(totalExpenses.toFixed(2)),
      by_category: byCategory,
      count: data?.length || 0,
    }
  }
}

export const expenseService = new ExpenseService()

import { createClient } from "@/lib/supabase/server"

export interface CustomerFilters {
  search?: string
}

export interface CreateCustomerData {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface UpdateCustomerData {
  name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export class CustomerService {
  async list(filters: CustomerFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("customers")
      .select("*")
      .order("name")

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Customer not found")
    }

    return data
  }

  async getOrders(customerId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        total,
        payment_method,
        payment_status,
        created_at
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data
  }

  async create(data: CreateCustomerData) {
    const supabase = await createClient()

    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        order_count: 0,
        total_spent: 0,
      })
      .select()
      .single()

    if (error) throw error

    return customer
  }

  async update(id: string, data: UpdateCustomerData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.address !== undefined) updateData.address = data.address
    if (data.notes !== undefined) updateData.notes = data.notes

    const { data: customer, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return customer
  }

  async delete(id: string) {
    const supabase = await createClient()

    const { data: orders } = await supabase.from("orders").select("id").eq("customer_id", id).limit(1)

    if (orders && orders.length > 0) {
      throw new Error("Cannot delete customer with existing orders. Please archive or reassign orders first.")
    }

    const { error } = await supabase.from("customers").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }
}

export const customerService = new CustomerService()

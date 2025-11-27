import { createClient } from "@/lib/supabase/server"

export interface SupplierFilters {
  search?: string
  is_active?: boolean
}

export interface CreateSupplierData {
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  is_active?: boolean
}

export interface UpdateSupplierData {
  name?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  is_active?: boolean
}

export class SupplierService {
  async list(filters: SupplierFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("suppliers")
      .select("*")
      .order("name")

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
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
      .from("suppliers")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Supplier not found")
    }

    return data
  }

  async create(data: CreateSupplierData) {
    const supabase = await createClient()

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .insert({
        name: data.name,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select()
      .single()

    if (error) throw error

    return supplier
  }

  async update(id: string, data: UpdateSupplierData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.contact_person !== undefined) updateData.contact_person = data.contact_person
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.address !== undefined) updateData.address = data.address
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: supplier, error } = await supabase
      .from("suppliers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return supplier
  }

  async delete(id: string) {
    const supabase = await createClient()

    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("id")
      .eq("supplier_id", id)
      .limit(1)

    if (ingredients && ingredients.length > 0) {
      throw new Error("Cannot delete supplier with linked ingredients. Please reassign or deactivate instead.")
    }

    const { error } = await supabase.from("suppliers").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }
}

export const supplierService = new SupplierService()

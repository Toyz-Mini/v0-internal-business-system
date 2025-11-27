import { createClient } from "@/lib/supabase/server"

export interface ModifierGroupFilters {
  product_id?: string
  is_active?: boolean
}

export interface CreateModifierGroupData {
  name: string
  product_id?: string
  is_required?: boolean
  min_selections?: number
  max_selections?: number
  is_active?: boolean
}

export interface UpdateModifierGroupData {
  name?: string
  product_id?: string
  is_required?: boolean
  min_selections?: number
  max_selections?: number
  is_active?: boolean
}

export interface CreateModifierOptionData {
  modifier_group_id: string
  name: string
  price_adjustment: number
  is_active?: boolean
}

export interface UpdateModifierOptionData {
  name?: string
  price_adjustment?: number
  is_active?: boolean
}

export class ModifierService {
  async listGroups(filters: ModifierGroupFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("modifier_groups")
      .select(`
        *,
        product:products(id, name),
        modifier_options:modifier_options(count)
      `)
      .order("name")

    if (filters.product_id) {
      query = query.eq("product_id", filters.product_id)
    }

    if (filters.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getGroupById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("modifier_groups")
      .select(`
        *,
        product:products(id, name),
        modifier_options:modifier_options(*)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Modifier group not found")
    }

    return data
  }

  async createGroup(data: CreateModifierGroupData) {
    const supabase = await createClient()

    const { data: group, error } = await supabase
      .from("modifier_groups")
      .insert({
        name: data.name,
        product_id: data.product_id || null,
        is_required: data.is_required || false,
        min_selections: data.min_selections || 0,
        max_selections: data.max_selections || 1,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select(`
        *,
        product:products(id, name)
      `)
      .single()

    if (error) throw error

    return group
  }

  async updateGroup(id: string, data: UpdateModifierGroupData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.product_id !== undefined) updateData.product_id = data.product_id
    if (data.is_required !== undefined) updateData.is_required = data.is_required
    if (data.min_selections !== undefined) updateData.min_selections = data.min_selections
    if (data.max_selections !== undefined) updateData.max_selections = data.max_selections
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: group, error } = await supabase
      .from("modifier_groups")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        product:products(id, name)
      `)
      .single()

    if (error) throw error

    return group
  }

  async deleteGroup(id: string) {
    const supabase = await createClient()

    await supabase.from("modifier_options").delete().eq("modifier_group_id", id)

    const { error } = await supabase.from("modifier_groups").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }

  async createOption(data: CreateModifierOptionData) {
    const supabase = await createClient()

    const { data: option, error } = await supabase
      .from("modifier_options")
      .insert({
        modifier_group_id: data.modifier_group_id,
        name: data.name,
        price_adjustment: data.price_adjustment,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select()
      .single()

    if (error) throw error

    return option
  }

  async updateOption(id: string, data: UpdateModifierOptionData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.price_adjustment !== undefined) updateData.price_adjustment = data.price_adjustment
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: option, error } = await supabase
      .from("modifier_options")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return option
  }

  async deleteOption(id: string) {
    const supabase = await createClient()

    const { error } = await supabase.from("modifier_options").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }
}

export const modifierService = new ModifierService()

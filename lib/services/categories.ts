import { createClient } from "@/lib/supabase/server"

export interface CategoryFilters {
  is_active?: boolean
}

export interface CreateCategoryData {
  name: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

export class CategoryService {
  async list(filters: CategoryFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("categories")
      .select(`
        *,
        products:products(count)
      `)
      .order("sort_order")
      .order("name")

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
      .from("categories")
      .select(`
        *,
        products:products(
          id,
          name,
          price,
          image_url,
          is_active
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Category not found")
    }

    return data
  }

  async create(data: CreateCategoryData) {
    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        name: data.name,
        description: data.description || null,
        sort_order: data.sort_order || 0,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select()
      .single()

    if (error) throw error

    return category
  }

  async update(id: string, data: UpdateCategoryData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: category, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return category
  }

  async delete(id: string) {
    const supabase = await createClient()

    const { data: products } = await supabase.from("products").select("id").eq("category_id", id)

    if (products && products.length > 0) {
      throw new Error(`Cannot delete category with ${products.length} products. Please reassign or delete products first.`)
    }

    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }
}

export const categoryService = new CategoryService()

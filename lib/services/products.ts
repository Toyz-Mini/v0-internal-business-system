import { createClient } from "@/lib/supabase/server"

export interface ProductFilters {
  category_id?: string
  is_active?: boolean
  search?: string
}

export interface CreateProductData {
  category_id: string
  name: string
  description?: string
  price: number
  cost?: number
  image_url?: string
  is_active?: boolean
}

export interface UpdateProductData {
  category_id?: string
  name?: string
  description?: string
  price?: number
  cost?: number
  image_url?: string
  is_active?: boolean
}

export class ProductService {
  async list(filters: ProductFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("products")
      .select(`
        *,
        category:categories(id, name)
      `)
      .order("name")

    if (filters.category_id) {
      query = query.eq("category_id", filters.category_id)
    }

    if (filters.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(id, name),
        recipes:recipes(
          id,
          qty_per_unit,
          ingredient:ingredients(id, name, unit, current_stock)
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Product not found")
    }

    return data
  }

  async create(data: CreateProductData) {
    const supabase = await createClient()

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        category_id: data.category_id,
        name: data.name,
        description: data.description || null,
        price: data.price,
        cost: data.cost || 0,
        image_url: data.image_url || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select(`
        *,
        category:categories(id, name)
      `)
      .single()

    if (error) throw error

    return product
  }

  async update(id: string, data: UpdateProductData) {
    const supabase = await createClient()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (data.category_id !== undefined) updateData.category_id = data.category_id
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.price !== undefined) updateData.price = data.price
    if (data.cost !== undefined) updateData.cost = data.cost
    if (data.image_url !== undefined) updateData.image_url = data.image_url
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: product, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        category:categories(id, name)
      `)
      .single()

    if (error) throw error

    return product
  }

  async delete(id: string) {
    const supabase = await createClient()

    const { error: recipesError } = await supabase.from("recipes").delete().eq("product_id", id)

    if (recipesError) throw recipesError

    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }

  async checkStockAvailability(productId: string, quantity: number) {
    const supabase = await createClient()

    const { data: recipes, error } = await supabase
      .from("recipes")
      .select(`
        qty_per_unit,
        ingredient:ingredients(id, name, current_stock)
      `)
      .eq("product_id", productId)

    if (error) throw error

    if (!recipes || recipes.length === 0) {
      return { available: true, insufficient: [] }
    }

    const insufficient: any[] = []

    for (const recipe of recipes) {
      const requiredQty = recipe.qty_per_unit * quantity
      const ingredient = recipe.ingredient as any

      if (ingredient.current_stock < requiredQty) {
        insufficient.push({
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          required: requiredQty,
          available: ingredient.current_stock,
          shortage: requiredQty - ingredient.current_stock,
        })
      }
    }

    return {
      available: insufficient.length === 0,
      insufficient,
    }
  }
}

export const productService = new ProductService()

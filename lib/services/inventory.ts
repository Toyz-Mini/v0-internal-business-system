import { createClient } from "@/lib/supabase/server"

export interface IngredientFilters {
  search?: string
  low_stock?: boolean
}

export interface CreateIngredientData {
  name: string
  unit: string
  current_stock: number
  min_stock?: number
  cost_per_unit?: number
  supplier_id?: string
}

export interface UpdateIngredientData {
  name?: string
  unit?: string
  current_stock?: number
  min_stock?: number
  cost_per_unit?: number
  supplier_id?: string
}

export interface AddStockData {
  quantity: number
  cost_per_unit?: number
  supplier_id?: string
  reference_number?: string
  notes?: string
}

export interface AdjustStockData {
  quantity: number
  type: "in" | "out"
  reason: string
  notes?: string
}

export class InventoryService {
  async list(filters: IngredientFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("ingredients")
      .select(`
        *,
        supplier:suppliers(id, name)
      `)
      .order("name")

    if (filters.search) {
      query = query.ilike("name", `%${filters.search}%`)
    }

    if (filters.low_stock) {
      query = query.filter("current_stock", "lte", "min_stock")
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("ingredients")
      .select(`
        *,
        supplier:suppliers(id, name, phone)
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Ingredient not found")
    }

    return data
  }

  async create(data: CreateIngredientData) {
    const supabase = await createClient()

    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .insert({
        name: data.name,
        unit: data.unit,
        current_stock: data.current_stock,
        min_stock: data.min_stock || 0,
        cost_per_unit: data.cost_per_unit || 0,
        supplier_id: data.supplier_id || null,
      })
      .select(`
        *,
        supplier:suppliers(id, name)
      `)
      .single()

    if (error) throw error

    return ingredient
  }

  async update(id: string, data: UpdateIngredientData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.unit !== undefined) updateData.unit = data.unit
    if (data.current_stock !== undefined) updateData.current_stock = data.current_stock
    if (data.min_stock !== undefined) updateData.min_stock = data.min_stock
    if (data.cost_per_unit !== undefined) updateData.cost_per_unit = data.cost_per_unit
    if (data.supplier_id !== undefined) updateData.supplier_id = data.supplier_id

    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        supplier:suppliers(id, name)
      `)
      .single()

    if (error) throw error

    return ingredient
  }

  async delete(id: string) {
    const supabase = await createClient()

    const { data: recipes } = await supabase.from("recipes").select("id").eq("ingredient_id", id).limit(1)

    if (recipes && recipes.length > 0) {
      throw new Error("Cannot delete ingredient that is used in recipes")
    }

    const { error } = await supabase.from("ingredients").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }

  async addStock(ingredientId: string, data: AddStockData, userId: string) {
    const supabase = await createClient()

    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("current_stock, cost_per_unit")
      .eq("id", ingredientId)
      .single()

    if (!ingredient) {
      throw new Error("Ingredient not found")
    }

    const previousStock = ingredient.current_stock
    const newStock = previousStock + data.quantity

    await supabase
      .from("ingredients")
      .update({
        current_stock: newStock,
        cost_per_unit: data.cost_per_unit || ingredient.cost_per_unit,
      })
      .eq("id", ingredientId)

    await supabase.from("stock_logs").insert({
      ingredient_id: ingredientId,
      type: "in",
      quantity: data.quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reference_type: "purchase",
      reference_number: data.reference_number || null,
      notes: data.notes || "Stock added",
      created_by: userId,
    })

    return await this.getById(ingredientId)
  }

  async adjustStock(ingredientId: string, data: AdjustStockData, userId: string) {
    const supabase = await createClient()

    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("current_stock")
      .eq("id", ingredientId)
      .single()

    if (!ingredient) {
      throw new Error("Ingredient not found")
    }

    const previousStock = ingredient.current_stock
    const newStock = data.type === "in" ? previousStock + data.quantity : previousStock - data.quantity

    if (newStock < 0) {
      throw new Error("Adjustment would result in negative stock")
    }

    await supabase.from("ingredients").update({ current_stock: newStock }).eq("id", ingredientId)

    await supabase.from("stock_logs").insert({
      ingredient_id: ingredientId,
      type: data.type,
      quantity: data.quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reference_type: "adjustment",
      notes: `${data.reason}${data.notes ? `: ${data.notes}` : ""}`,
      created_by: userId,
    })

    return await this.getById(ingredientId)
  }

  async getLogs(ingredientId: string, limit = 50) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("stock_logs")
      .select(`
        *,
        created_by_user:users!stock_logs_created_by_fkey(id, name)
      `)
      .eq("ingredient_id", ingredientId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) throw error

    return data
  }
}

export const inventoryService = new InventoryService()

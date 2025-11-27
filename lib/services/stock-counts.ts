import { createClient } from "@/lib/supabase/server"

export interface StockCountFilters {
  status?: string
}

export interface CreateStockCountData {
  title: string
  notes?: string
  items: Array<{
    ingredient_id: string
    counted_quantity: number
  }>
}

export interface UpdateStockCountData {
  status?: string
  notes?: string
}

export class StockCountService {
  async list(filters: StockCountFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("stock_counts")
      .select(`
        *,
        stock_count_items:stock_count_items(count)
      `)
      .order("created_at", { ascending: false })

    if (filters.status) {
      query = query.eq("status", filters.status)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("stock_counts")
      .select(`
        *,
        stock_count_items:stock_count_items(
          *,
          ingredient:ingredients(id, name, unit, current_stock)
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Stock count not found")
    }

    return data
  }

  async create(data: CreateStockCountData, userId: string) {
    const supabase = await createClient()

    const { data: stockCount, error: scError } = await supabase
      .from("stock_counts")
      .insert({
        title: data.title,
        status: "in_progress",
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single()

    if (scError) throw scError

    if (data.items && data.items.length > 0) {
      const items = await Promise.all(
        data.items.map(async (item) => {
          const { data: ingredient } = await supabase
            .from("ingredients")
            .select("current_stock")
            .eq("id", item.ingredient_id)
            .single()

          const systemQuantity = ingredient?.current_stock || 0
          const variance = item.counted_quantity - systemQuantity

          return {
            stock_count_id: stockCount.id,
            ingredient_id: item.ingredient_id,
            system_quantity: systemQuantity,
            counted_quantity: item.counted_quantity,
            variance,
          }
        })
      )

      const { error: itemsError } = await supabase.from("stock_count_items").insert(items)

      if (itemsError) throw itemsError
    }

    return await this.getById(stockCount.id)
  }

  async update(id: string, data: UpdateStockCountData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.status !== undefined) updateData.status = data.status
    if (data.notes !== undefined) updateData.notes = data.notes

    const { data: stockCount, error } = await supabase
      .from("stock_counts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return stockCount
  }

  async complete(id: string, userId: string) {
    const supabase = await createClient()

    const stockCount = await this.getById(id)

    if (stockCount.status === "completed") {
      throw new Error("Stock count already completed")
    }

    const items = stockCount.stock_count_items as any[]

    for (const item of items) {
      if (item.variance !== 0) {
        const ingredient = item.ingredient as any
        const previousStock = ingredient.current_stock
        const newStock = item.counted_quantity

        await supabase
          .from("ingredients")
          .update({ current_stock: newStock })
          .eq("id", item.ingredient_id)

        await supabase.from("stock_logs").insert({
          ingredient_id: item.ingredient_id,
          type: item.variance > 0 ? "in" : "out",
          quantity: Math.abs(item.variance),
          previous_stock: previousStock,
          new_stock: newStock,
          reference_type: "stock_count",
          reference_id: stockCount.id,
          notes: `Stock count adjustment: ${stockCount.title}`,
          created_by: userId,
        })
      }
    }

    await supabase
      .from("stock_counts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id)

    return await this.getById(id)
  }

  async delete(id: string) {
    const supabase = await createClient()

    const stockCount = await this.getById(id)

    if (stockCount.status === "completed") {
      throw new Error("Cannot delete completed stock count")
    }

    await supabase.from("stock_count_items").delete().eq("stock_count_id", id)

    const { error } = await supabase.from("stock_counts").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  }
}

export const stockCountService = new StockCountService()

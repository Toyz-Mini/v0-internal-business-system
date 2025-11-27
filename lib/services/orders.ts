import { createClient } from "@/lib/supabase/server"

export interface OrderFilters {
  customer_id?: string
  payment_status?: string
  payment_method?: string
  date_from?: string
  date_to?: string
}

export interface CreateOrderData {
  customer_id?: string
  items: Array<{
    product_id: string
    quantity: number
    price: number
    modifiers?: Array<{
      modifier_id: string
      price_adjustment: number
    }>
    notes?: string
  }>
  payment_method: string
  subtotal: number
  tax?: number
  discount?: number
  total: number
  notes?: string
}

export class OrderService {
  async generateOrderNumber(): Promise<string> {
    const supabase = await createClient()

    const today = new Date().toISOString().split("T")[0].replace(/-/g, "")

    const { data: lastOrder } = await supabase
      .from("orders")
      .select("order_number")
      .like("order_number", `ORD-${today}-%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    let sequence = 1

    if (lastOrder && lastOrder.order_number) {
      const parts = lastOrder.order_number.split("-")
      sequence = parseInt(parts[2] || "0") + 1
    }

    return `ORD-${today}-${sequence.toString().padStart(4, "0")}`
  }

  async list(filters: OrderFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("orders")
      .select(`
        *,
        customer:customers(id, name, phone),
        order_items:order_items(
          id,
          product_id,
          product_name,
          quantity,
          price,
          subtotal
        )
      `)
      .order("created_at", { ascending: false })

    if (filters.customer_id) {
      query = query.eq("customer_id", filters.customer_id)
    }

    if (filters.payment_status) {
      query = query.eq("payment_status", filters.payment_status)
    }

    if (filters.payment_method) {
      query = query.eq("payment_method", filters.payment_method)
    }

    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to)
    }

    const { data, error } = await query

    if (error) throw error

    return data
  }

  async getById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        customer:customers(id, name, phone, email),
        order_items:order_items(
          id,
          product_id,
          product_name,
          quantity,
          price,
          subtotal,
          notes
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Order not found")
    }

    return data
  }

  async create(data: CreateOrderData, userId: string) {
    const supabase = await createClient()

    for (const item of data.items) {
      const { data: recipes } = await supabase
        .from("recipes")
        .select(`
          qty_per_unit,
          ingredient:ingredients(id, current_stock)
        `)
        .eq("product_id", item.product_id)

      if (recipes && recipes.length > 0) {
        for (const recipe of recipes) {
          const ingredient = recipe.ingredient as any
          const requiredQty = recipe.qty_per_unit * item.quantity

          if (ingredient.current_stock < requiredQty) {
            throw new Error(
              `Insufficient stock for ingredient. Required: ${requiredQty}, Available: ${ingredient.current_stock}`
            )
          }
        }
      }
    }

    const orderNumber = await this.generateOrderNumber()

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: data.customer_id || null,
        subtotal: data.subtotal,
        tax: data.tax || 0,
        discount: data.discount || 0,
        total: data.total,
        payment_method: data.payment_method,
        payment_status: "paid",
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single()

    if (orderError) throw orderError

    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
      notes: item.notes || null,
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

    if (itemsError) throw itemsError

    for (const item of data.items) {
      const { data: recipes } = await supabase
        .from("recipes")
        .select("ingredient_id, qty_per_unit")
        .eq("product_id", item.product_id)

      if (recipes && recipes.length > 0) {
        for (const recipe of recipes) {
          const quantityToDeduct = recipe.qty_per_unit * item.quantity

          const { data: ingredient } = await supabase
            .from("ingredients")
            .select("current_stock")
            .eq("id", recipe.ingredient_id)
            .single()

          if (ingredient) {
            const previousStock = ingredient.current_stock
            const newStock = previousStock - quantityToDeduct

            await supabase
              .from("ingredients")
              .update({ current_stock: newStock })
              .eq("id", recipe.ingredient_id)

            await supabase.from("stock_logs").insert({
              ingredient_id: recipe.ingredient_id,
              type: "out",
              quantity: quantityToDeduct,
              previous_stock: previousStock,
              new_stock: newStock,
              reference_id: order.id,
              reference_type: "order",
              notes: `Stock deducted for order ${orderNumber}`,
              created_by: userId,
            })
          }
        }
      }
    }

    if (data.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("order_count, total_spent")
        .eq("id", data.customer_id)
        .single()

      if (customer) {
        await supabase
          .from("customers")
          .update({
            order_count: customer.order_count + 1,
            total_spent: customer.total_spent + data.total,
            last_order_at: new Date().toISOString(),
          })
          .eq("id", data.customer_id)
      }
    }

    return await this.getById(order.id)
  }

  async updateStatus(id: string, status: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: status })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return data
  }
}

export const orderService = new OrderService()

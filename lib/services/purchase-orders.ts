import { createClient } from "@/lib/supabase/server"

export interface PurchaseOrderFilters {
  supplier_id?: string
  status?: string
}

export interface CreatePurchaseOrderData {
  supplier_id: string
  order_number?: string
  expected_date?: string
  notes?: string
  items: Array<{
    ingredient_id: string
    quantity: number
    unit_cost: number
  }>
}

export interface UpdatePurchaseOrderData {
  status?: string
  expected_date?: string
  received_date?: string
  notes?: string
}

export class PurchaseOrderService {
  async generateOrderNumber(): Promise<string> {
    const supabase = await createClient()

    const today = new Date().toISOString().split("T")[0].replace(/-/g, "")

    const { data: lastPO } = await supabase
      .from("purchase_orders")
      .select("order_number")
      .like("order_number", `PO-${today}-%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let sequence = 1

    if (lastPO && lastPO.order_number) {
      const parts = lastPO.order_number.split("-")
      sequence = parseInt(parts[2] || "0") + 1
    }

    return `PO-${today}-${sequence.toString().padStart(4, "0")}`
  }

  async list(filters: PurchaseOrderFilters = {}) {
    const supabase = await createClient()

    let query = supabase
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(id, name),
        purchase_order_items:purchase_order_items(count)
      `)
      .order("created_at", { ascending: false })

    if (filters.supplier_id) {
      query = query.eq("supplier_id", filters.supplier_id)
    }

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
      .from("purchase_orders")
      .select(`
        *,
        supplier:suppliers(id, name, contact_person, phone),
        purchase_order_items:purchase_order_items(
          *,
          ingredient:ingredients(id, name, unit)
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    if (!data) {
      throw new Error("Purchase order not found")
    }

    return data
  }

  async create(data: CreatePurchaseOrderData, userId: string) {
    const supabase = await createClient()

    const orderNumber = data.order_number || (await this.generateOrderNumber())

    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)

    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        order_number: orderNumber,
        supplier_id: data.supplier_id,
        total_amount: totalAmount,
        status: "pending",
        expected_date: data.expected_date || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .select()
      .single()

    if (poError) throw poError

    const items = data.items.map((item) => ({
      purchase_order_id: po.id,
      ingredient_id: item.ingredient_id,
      quantity_ordered: item.quantity,
      quantity_received: 0,
      unit_cost: item.unit_cost,
      subtotal: item.quantity * item.unit_cost,
    }))

    const { error: itemsError } = await supabase.from("purchase_order_items").insert(items)

    if (itemsError) throw itemsError

    return await this.getById(po.id)
  }

  async update(id: string, data: UpdatePurchaseOrderData) {
    const supabase = await createClient()

    const updateData: any = {}

    if (data.status !== undefined) updateData.status = data.status
    if (data.expected_date !== undefined) updateData.expected_date = data.expected_date
    if (data.received_date !== undefined) updateData.received_date = data.received_date
    if (data.notes !== undefined) updateData.notes = data.notes

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return po
  }

  async receive(id: string, userId: string) {
    const supabase = await createClient()

    const po = await this.getById(id)

    if (po.status === "received") {
      throw new Error("Purchase order already received")
    }

    const items = po.purchase_order_items as any[]

    for (const item of items) {
      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("current_stock")
        .eq("id", item.ingredient_id)
        .single()

      if (ingredient) {
        const previousStock = ingredient.current_stock
        const newStock = previousStock + item.quantity_ordered

        await supabase
          .from("ingredients")
          .update({ current_stock: newStock })
          .eq("id", item.ingredient_id)

        await supabase.from("stock_logs").insert({
          ingredient_id: item.ingredient_id,
          type: "in",
          quantity: item.quantity_ordered,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_type: "purchase_order",
          reference_id: po.id,
          notes: `Received from PO ${po.order_number}`,
          created_by: userId,
        })

        await supabase
          .from("purchase_order_items")
          .update({ quantity_received: item.quantity_ordered })
          .eq("id", item.id)
      }
    }

    await supabase
      .from("purchase_orders")
      .update({
        status: "received",
        received_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", id)

    return await this.getById(id)
  }
}

export const purchaseOrderService = new PurchaseOrderService()

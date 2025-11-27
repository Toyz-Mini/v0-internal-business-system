import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission (admin or cashier)
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (!userData || !["admin", "cashier"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden - Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { void_reason } = body

    if (!void_reason) {
      return NextResponse.json({ error: "Void reason is required" }, { status: 400 })
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single()

    if (orderError) throw orderError

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if order is already voided
    if (order.payment_status === "voided") {
      return NextResponse.json({ error: "Order is already voided" }, { status: 400 })
    }

    // Check if order can be voided (e.g., within time limit)
    const orderDate = new Date(order.created_at)
    const now = new Date()
    const minutesSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60)

    // Get void window from settings (default 30 minutes)
    const { data: settings } = await supabase.from("settings").select("*").single()
    const voidWindowMinutes = 30 // Default, can be made configurable

    if (minutesSinceOrder > voidWindowMinutes && userData.role !== "admin") {
      return NextResponse.json(
        { error: `Order can only be voided within ${voidWindowMinutes} minutes (admin override available)` },
        { status: 400 },
      )
    }

    // Update order status to voided
    const { data: voidedOrder, error: voidError } = await supabase
      .from("orders")
      .update({
        payment_status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: user.id,
        void_reason,
      })
      .eq("id", id)
      .select()
      .single()

    if (voidError) throw voidError

    // Reverse stock deductions for this order
    // Get all order items and their ingredient recipes
    for (const item of order.order_items) {
      if (item.product_id) {
        // Get recipes for this product
        const { data: recipes } = await supabase
          .from("recipes")
          .select("ingredient_id, qty_per_unit")
          .eq("product_id", item.product_id)

        if (recipes && recipes.length > 0) {
          // Add stock back for each ingredient
          for (const recipe of recipes) {
            const quantityToReturn = recipe.qty_per_unit * item.quantity

            // Get current stock
            const { data: ingredient } = await supabase
              .from("ingredients")
              .select("current_stock")
              .eq("id", recipe.ingredient_id)
              .single()

            if (ingredient) {
              const previousStock = ingredient.current_stock
              const newStock = previousStock + quantityToReturn

              // Update ingredient stock
              await supabase.from("ingredients").update({ current_stock: newStock }).eq("id", recipe.ingredient_id)

              // Create stock log for void
              await supabase.from("stock_logs").insert({
                ingredient_id: recipe.ingredient_id,
                type: "in",
                quantity: quantityToReturn,
                previous_stock: previousStock,
                new_stock: newStock,
                reference_id: id,
                reference_type: "void",
                notes: `Stock returned from voided order ${order.order_number}`,
                created_by: user.id,
              })
            }
          }
        }
      }
    }

    // Update customer stats if customer exists
    if (order.customer_id) {
      const { data: customer } = await supabase.from("customers").select("order_count, total_spent").eq("id", order.customer_id).single()

      if (customer) {
        await supabase
          .from("customers")
          .update({
            order_count: Math.max(0, customer.order_count - 1),
            total_spent: Math.max(0, customer.total_spent - order.total),
          })
          .eq("id", order.customer_id)
      }
    }

    return NextResponse.json({
      success: true,
      data: voidedOrder,
      message: "Order voided successfully. Stock has been returned to inventory.",
    })
  } catch (error: any) {
    console.error("[API] Void order error:", error)
    return NextResponse.json({ error: error?.message || "Failed to void order" }, { status: 500 })
  }
}

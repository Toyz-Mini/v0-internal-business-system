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

    // Check if user is admin (only admins can process refunds)
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { refund_amount, refund_reason } = body

    if (!refund_amount) {
      return NextResponse.json({ error: "Refund amount is required" }, { status: 400 })
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

    // Check if order is already refunded
    if (order.payment_status === "refunded") {
      return NextResponse.json({ error: "Order is already refunded" }, { status: 400 })
    }

    // Validate refund amount
    const numericRefundAmount = Number.parseFloat(refund_amount)
    if (numericRefundAmount > order.total) {
      return NextResponse.json({ error: "Refund amount cannot exceed order total" }, { status: 400 })
    }

    // Determine if this is a full or partial refund
    const isFullRefund = numericRefundAmount === order.total
    const newPaymentStatus = isFullRefund ? "refunded" : "paid" // Partial refunds keep status as paid

    // Update order with refund information
    const { data: refundedOrder, error: refundError } = await supabase
      .from("orders")
      .update({
        payment_status: newPaymentStatus,
        refunded_at: new Date().toISOString(),
        refunded_by: user.id,
        refund_amount: numericRefundAmount,
        notes: `${order.notes || ""}\n\nRefund: ${refund_reason || "No reason provided"}`.trim(),
      })
      .eq("id", id)
      .select()
      .single()

    if (refundError) throw refundError

    // For full refunds, reverse stock deductions
    if (isFullRefund) {
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

                // Create stock log for refund
                await supabase.from("stock_logs").insert({
                  ingredient_id: recipe.ingredient_id,
                  type: "in",
                  quantity: quantityToReturn,
                  previous_stock: previousStock,
                  new_stock: newStock,
                  reference_id: id,
                  reference_type: "refund",
                  notes: `Stock returned from refunded order ${order.order_number}`,
                  created_by: user.id,
                })
              }
            }
          }
        }
      }
    }

    // Update customer stats if customer exists
    if (order.customer_id) {
      const { data: customer } = await supabase.from("customers").select("order_count, total_spent").eq("id", order.customer_id).single()

      if (customer) {
        const newTotalSpent = Math.max(0, customer.total_spent - numericRefundAmount)
        const newOrderCount = isFullRefund ? Math.max(0, customer.order_count - 1) : customer.order_count

        await supabase
          .from("customers")
          .update({
            order_count: newOrderCount,
            total_spent: newTotalSpent,
          })
          .eq("id", order.customer_id)
      }
    }

    return NextResponse.json({
      success: true,
      data: refundedOrder,
      message: isFullRefund ? "Order fully refunded. Stock has been returned to inventory." : "Partial refund processed successfully.",
      refund_type: isFullRefund ? "full" : "partial",
    })
  } catch (error: any) {
    console.error("[API] Refund order error:", error)
    return NextResponse.json({ error: error?.message || "Failed to process refund" }, { status: 500 })
  }
}

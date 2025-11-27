import { z } from "zod"

export const createOrderItemSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  quantity: z.number().int().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
  modifiers: z
    .array(
      z.object({
        modifier_id: z.string().uuid("Invalid modifier ID"),
        price_adjustment: z.number(),
      })
    )
    .optional(),
  notes: z.string().max(500).optional(),
})

export const createOrderSchema = z.object({
  customer_id: z.string().uuid("Invalid customer ID").optional(),
  items: z.array(createOrderItemSchema).min(1, "Order must have at least one item"),
  payment_method: z.enum(["cash", "card", "transfer", "ewallet"], {
    errorMap: () => ({ message: "Invalid payment method" }),
  }),
  subtotal: z.number().nonnegative("Subtotal must be non-negative"),
  tax: z.number().nonnegative("Tax must be non-negative").optional(),
  discount: z.number().nonnegative("Discount must be non-negative").optional(),
  total: z.number().positive("Total must be positive"),
  notes: z.string().max(1000).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "refunded", "voided"], {
    errorMap: () => ({ message: "Invalid status" }),
  }),
})

export type CreateOrderDTO = z.infer<typeof createOrderSchema>
export type CreateOrderItemDTO = z.infer<typeof createOrderItemSchema>
export type UpdateOrderStatusDTO = z.infer<typeof updateOrderStatusSchema>

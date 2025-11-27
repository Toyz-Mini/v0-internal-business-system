import { z } from "zod"

export const createProductSchema = z.object({
  category_id: z.string().uuid("Invalid category ID"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  price: z.number().positive("Price must be positive"),
  cost: z.number().nonnegative("Cost cannot be negative").optional(),
  image_url: z.string().url("Invalid image URL").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
})

export const updateProductSchema = z.object({
  category_id: z.string().uuid("Invalid category ID").optional(),
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  description: z.string().max(500, "Description is too long").optional().nullable(),
  price: z.number().positive("Price must be positive").optional(),
  cost: z.number().nonnegative("Cost cannot be negative").optional(),
  image_url: z.string().url("Invalid image URL").optional().nullable().or(z.literal("")),
  is_active: z.boolean().optional(),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  sort_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  description: z.string().max(500, "Description is too long").optional().nullable(),
  sort_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional(),
})

export type CreateProductDTO = z.infer<typeof createProductSchema>
export type UpdateProductDTO = z.infer<typeof updateProductSchema>
export type CreateCategoryDTO = z.infer<typeof createCategorySchema>
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>

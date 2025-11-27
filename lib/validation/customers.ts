import { z } from "zod"

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  phone: z.string().max(20).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export type CreateCustomerDTO = z.infer<typeof createCustomerSchema>
export type UpdateCustomerDTO = z.infer<typeof updateCustomerSchema>

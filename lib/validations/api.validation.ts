import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional()
});

export const updateCategorySchema = createCategorySchema.partial();

export const createProductSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be positive'),
  cost_price: z.number().min(0).optional(),
  image_url: z.string().url().optional(),
  sku: z.string().max(50).optional(),
  is_available: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional()
});

export const updateProductSchema = createProductSchema.partial();

export const createModifierGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  is_required: z.boolean().optional(),
  max_selection: z.number().int().min(1).optional()
});

export const createModifierOptionSchema = z.object({
  group_id: z.string().uuid('Invalid group ID'),
  name: z.string().min(1, 'Name is required').max(100),
  price_adjustment: z.number().optional(),
  is_default: z.boolean().optional()
});

export const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  unit: z.string().min(1, 'Unit is required').max(50),
  current_stock: z.number().min(0).optional(),
  min_stock: z.number().min(0).optional(),
  cost_per_unit: z.number().min(0).optional(),
  supplier_id: z.string().uuid().optional(),
  is_active: z.boolean().optional()
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const updateStockSchema = z.object({
  ingredient_id: z.string().uuid('Invalid ingredient ID'),
  type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().max(500).optional(),
  created_by: z.string().uuid().optional(),
  reference_id: z.string().uuid().optional(),
  reference_type: z.string().max(50).optional()
});

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  phone: z.string().max(20).optional(),
  email: z.string().email('Invalid email').optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  is_active: z.boolean().optional()
});

export const orderItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  product_name: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: z.number().positive('Unit price must be positive'),
  modifiers: z.any().optional(),
  notes: z.string().max(500).optional()
});

export const createOrderSchema = z.object({
  customer_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  order_type: z.enum(['dine-in', 'takeaway', 'delivery']),
  table_number: z.string().max(20).optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  payment_method: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  discount_amount: z.number().min(0).optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'ready', 'completed', 'cancelled'])
});

export const updatePaymentStatusSchema = z.object({
  payment_status: z.enum(['pending', 'paid', 'refunded']),
  payment_method: z.string().max(50).optional()
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;
export type CreateModifierOptionInput = z.infer<typeof createModifierOptionSchema>;
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;

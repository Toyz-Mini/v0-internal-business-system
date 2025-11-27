export type UserRole = "admin" | "manager" | "cashier" | "kitchen" | "staff"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  role_id?: number
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
  user_role?: Role
}

export interface Employee {
  id: string
  user_id?: string
  name: string
  ic_number?: string
  phone?: string
  email?: string
  address?: string
  position: string
  salary_type: "hourly" | "monthly"
  salary_rate: number
  join_date: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Extended personal fields
  gender?: "male" | "female"
  date_of_birth?: string
  nationality?: string
  religion?: string
  race?: string
  marital_status?: "single" | "married" | "divorced" | "widowed"
  emergency_contact_name?: string
  emergency_contact_phone?: string
  // Bank info
  bank_name?: string
  penama_akaun?: string
  account_name?: string // Keep for backwards compatibility
  account_number?: string
  // Documents
  employee_photo?: string
  ic_copy?: string
  passport_copy?: string
  // Employment
  employment_end_date?: string
}

export interface Attendance {
  id: string
  employee_id: string
  clock_in: string
  clock_out?: string
  clock_in_lat?: number
  clock_in_lng?: number
  clock_out_lat?: number
  clock_out_lng?: number
  total_hours?: number
  overtime_hours: number
  is_late: boolean
  notes?: string
  created_at: string
  employee?: Employee
  // OT fields
  ot_clock_in?: string
  ot_clock_out?: string
  remarks?: string
  approved_by?: string
  ot_approved?: boolean
  approver?: User
  photo_url?: string
  photo_storage_path?: string
  geo_lat?: number
  geo_lon?: number
  photo_required?: boolean
}

export interface Category {
  id: string
  name: string
  description?: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  category_id?: string
  name: string
  description?: string
  price: number
  cost: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface ModifierGroup {
  id: string
  name: string
  is_required: boolean
  max_selections: number
  created_at: string
  modifiers?: Modifier[]
}

export interface Modifier {
  id: string
  group_id: string
  name: string
  price_adjustment: number
  is_active: boolean
  created_at: string
}

export type IngredientUnit = "kg" | "g" | "pcs"

export const INGREDIENT_UNITS: { value: IngredientUnit; label: string; fullLabel: string }[] = [
  { value: "kg", label: "kg", fullLabel: "kilogram" },
  { value: "g", label: "g", fullLabel: "gram" },
  { value: "pcs", label: "pcs", fullLabel: "pieces" },
]

export interface Ingredient {
  id: string
  name: string
  unit: IngredientUnit
  current_stock: number
  min_stock: number
  cost_per_unit: number
  avg_cost_per_unit?: number
  supplier_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
  supplier?: Supplier
}

export interface Recipe {
  id: string
  product_id: string
  ingredient_id: string
  qty_per_unit: number
  ingredient?: Ingredient
}

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StockLog {
  id: string
  ingredient_id: string
  supplier_id?: string
  type: "in" | "out" | "adjustment"
  quantity: number
  previous_stock: number
  new_stock: number
  cost_per_unit?: number
  unit_cost?: number
  total_cost?: number
  reference_type?: string
  reference_id?: string
  notes?: string
  created_by?: string
  received_by?: string
  created_at: string
  ingredient?: Ingredient
  supplier?: Supplier
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  tags: string[]
  order_count: number
  total_spent: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id?: string
  cashier_id?: string
  source_type?: "takeaway" | "gomamam"
  customer_phone?: string
  customer_country_code?: string
  subtotal: number
  discount_amount: number
  discount_type?: "percentage" | "fixed"
  total: number
  payment_method: "cash" | "qrpay" | "bank_transfer" | "split"
  payment_status: "pending" | "paid" | "voided" | "refunded"
  split_payments?: SplitPayment[]
  voided_at?: string
  voided_by?: string
  void_reason?: string
  refunded_at?: string
  refunded_by?: string
  refund_amount?: number
  notes?: string
  created_at: string
  customer?: Customer
  cashier?: User
  items?: OrderItem[]
}

export interface SplitPayment {
  method: "cash" | "qrpay" | "bank_transfer"
  amount: number
}

export interface OrderItem {
  id: string
  order_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  modifiers: { name: string; price: number }[]
  subtotal: number
  notes?: string
  discount_amount?: number
  discount_type?: "percentage" | "fixed"
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
  modifiers: { name: string; price: number }[]
  notes?: string
  discount_amount?: number
  discount_type?: "percentage" | "fixed"
}

export interface ExpenseCategory {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface Expense {
  id: string
  category_id?: string
  amount: number
  description?: string
  expense_date: string
  receipt_url?: string
  created_by?: string
  created_at: string
  category?: ExpenseCategory
}

export interface DashboardStats {
  todaySales: number
  todayOrders: number
  todayExpenses: number
  lowStockItems: Ingredient[]
  clockedInStaff: (Attendance & { employee: Employee })[]
}

export interface POSSettings {
  void_window_minutes: number
  allow_partial_refund: boolean
  require_void_reason: boolean
}

export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id?: string
  status: "draft" | "pending" | "received" | "cancelled"
  total_amount: number
  notes?: string
  expected_date?: string
  received_date?: string
  received_by?: string
  created_by?: string
  created_at: string
  updated_at: string
  supplier?: Supplier
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  ingredient_id: string
  quantity: number
  unit_cost: number
  received_quantity: number
  created_at: string
  ingredient?: Ingredient
}

export interface Shift {
  id: string
  outlet_id?: string
  opened_by?: string
  opened_at: string
  closed_by?: string
  closed_at?: string
  status: "open" | "closed"
  opening_stock_count_id?: string
  closing_stock_count_id?: string
  notes?: string
  created_at: string
  updated_at: string
  opener?: User
  closer?: User
  opening_count?: StockCount
  closing_count?: StockCount
}

export interface StockCount {
  id: string
  outlet_id?: string
  type: "opening" | "closing"
  shift_id?: string
  counted_by: string
  status: "draft" | "submitted" | "approved" | "rejected"
  notes?: string
  photos: string[]
  total_expected_value: number
  total_counted_value: number
  total_variance_value: number
  variance_percentage: number
  submitted_at?: string
  approved_at?: string
  approved_by?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  counter?: User
  approver?: User
  items?: StockCountItem[]
}

export interface StockCountItem {
  id: string
  stock_count_id: string
  ingredient_id: string
  unit: string
  quantity_counted?: number
  expected_quantity: number
  variance_qty: number
  unit_cost: number
  variance_value: number
  not_counted: boolean
  photo_url?: string
  notes?: string
  created_at: string
  updated_at: string
  ingredient?: Ingredient
}

export interface StockCountSettings {
  opening_variance_threshold: number
  closing_variance_threshold: number
  require_photos_for_variance_above: number
  enable_offline_counts: boolean
}

export interface Claim {
  id: string
  employee_id: string
  claim_type: "mileage" | "other"
  claim_date: string
  distance_km?: number
  amount: number
  place_route?: string
  attachment_url?: string
  status: "pending" | "approved" | "rejected"
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  notes?: string
  created_at: string
  updated_at: string
  employee?: Employee
  approver?: User
}

export interface LeaveBalance {
  id: string
  employee_id: string
  year: number
  annual_balance: number
  replacement_balance: number
  medical_balance: number
  created_at: string
  updated_at: string
  employee?: Employee
}

export interface LeaveApplication {
  id: string
  employee_id: string
  leave_type: "annual" | "replacement" | "medical" | "paid_leave" | "unpaid_leave"
  application_date: string
  start_date: string
  end_date: string
  total_days: number
  reason?: string
  attachment_url?: string
  status: "pending" | "approved" | "rejected"
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  employee?: Employee
  approver?: User
}

export interface EmployeeDocument {
  id: string
  employee_id: string
  storage_path: string
  filename: string
  mime_type: string
  file_size: number
  uploaded_by?: string
  uploaded_at: string
  document_type: "photo" | "ic" | "passport" | "other"
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: number
  name: string
  description?: string
  default_permissions: string[]
  created_at: string
  updated_at: string
}

export interface Permission {
  code: string
  label: string
  category: string
  description?: string
  created_at: string
}

export interface RolePermission {
  role_id: number
  permission_code: string
  created_at: string
}

export interface Invitation {
  id: string
  token: string
  token_hash?: string
  role_id: number
  email?: string
  expires_at: string
  used: boolean
  used_at?: string
  created_by?: string
  created_at: string
  role?: Role
  creator?: User
}

export interface ReceiptSettings {
  receipt_logo_url?: string
  receipt_footer_image_url?: string
  printer_type: "browser" | "thermal" | "epson" | "star"
  printer_device_id?: string
  receipt_width_mm: number
  show_item_images: boolean
  show_logo: boolean
  show_business_name: boolean
  show_footer_image: boolean
  printer_margin_top: number
  printer_margin_bottom: number
}

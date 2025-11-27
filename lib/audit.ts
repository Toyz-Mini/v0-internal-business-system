// Audit logging utility for client-side operations

import { createClient } from "@/lib/supabase/client"

export type AuditAction =
  | "login"
  | "logout"
  | "order_create"
  | "order_void"
  | "order_refund"
  | "stock_adjustment"
  | "stock_purchase"
  | "employee_create"
  | "employee_update"
  | "salary_change"
  | "attendance_clock_in"
  | "attendance_clock_out"
  | "settings_change"

interface AuditLogParams {
  action: AuditAction
  tableName: string
  recordId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from("audit_logs").insert({
      user_id: user?.id || null,
      user_email: user?.email || "system",
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId || null,
      old_data: params.oldData || null,
      new_data: params.newData || null,
      metadata: params.metadata || null,
    })

    if (error) {
      console.error("Audit log error:", error)
    }
  } catch (error) {
    // Don't throw - audit logging should not break main operations
    console.error("Audit log error:", error)
  }
}

// Convenience functions for common audit operations
export async function auditOrderVoid(orderId: string, orderNumber: string, reason: string): Promise<void> {
  await logAuditEvent({
    action: "order_void",
    tableName: "orders",
    recordId: orderId,
    metadata: { order_number: orderNumber, reason },
  })
}

export async function auditOrderRefund(orderId: string, orderNumber: string, amount: number): Promise<void> {
  await logAuditEvent({
    action: "order_refund",
    tableName: "orders",
    recordId: orderId,
    metadata: { order_number: orderNumber, refund_amount: amount },
  })
}

export async function auditStockAdjustment(
  ingredientId: string,
  ingredientName: string,
  previousStock: number,
  newStock: number,
  reason: string,
): Promise<void> {
  await logAuditEvent({
    action: "stock_adjustment",
    tableName: "ingredients",
    recordId: ingredientId,
    oldData: { current_stock: previousStock },
    newData: { current_stock: newStock },
    metadata: { ingredient_name: ingredientName, reason },
  })
}

export async function auditSalaryChange(
  employeeId: string,
  employeeName: string,
  oldSalary: number,
  newSalary: number,
): Promise<void> {
  await logAuditEvent({
    action: "salary_change",
    tableName: "employees",
    recordId: employeeId,
    oldData: { salary_rate: oldSalary },
    newData: { salary_rate: newSalary },
    metadata: { employee_name: employeeName },
  })
}

import type { UserRole } from "./types"

export function canVoidOrder(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canRefundOrder(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canApplyDiscount(userRole: UserRole): boolean {
  return ["admin", "manager", "cashier"].includes(userRole)
}

export function canManageInventory(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canAdjustStock(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canManageEmployees(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canApproveLeave(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canApproveClaims(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canManageSettings(userRole: UserRole): boolean {
  return userRole === "admin"
}

export function canViewReports(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canManageExpenses(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canManageSuppliers(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canManageCustomers(userRole: UserRole): boolean {
  return ["admin", "manager", "cashier"].includes(userRole)
}

export function canManageMenu(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

export function canApproveStockCount(userRole: UserRole): boolean {
  return ["admin", "manager"].includes(userRole)
}

import type { UserRole } from "./types"

export const PERMISSIONS = {
  POS_ACCESS: "pos.access",
  POS_VOID_ORDER: "pos.void_order",
  POS_REFUND: "pos.refund",
  POS_DISCOUNT: "pos.discount",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_MANAGE: "inventory.manage",
  INVENTORY_ADD_STOCK: "inventory.add_stock",
  INVENTORY_ADJUST_STOCK: "inventory.adjust_stock",

  ORDERS_VIEW: "orders.view",
  ORDERS_MANAGE: "orders.manage",
  ORDERS_VIEW_ALL: "orders.view_all",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",

  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_MANAGE: "employees.manage",

  HR_VIEW: "hr.view",
  HR_MANAGE: "hr.manage",
  HR_APPROVE_LEAVE: "hr.approve_leave",
  HR_APPROVE_CLAIMS: "hr.approve_claims",
  HR_VIEW_ATTENDANCE: "hr.view_attendance",

  REPORTS_VIEW: "reports.view",
  REPORTS_SALES: "reports.sales",
  REPORTS_INVENTORY: "reports.inventory",
  REPORTS_EMPLOYEE: "reports.employee",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_MANAGE: "settings.manage",

  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_MANAGE: "suppliers.manage",

  EXPENSES_VIEW: "expenses.view",
  EXPENSES_MANAGE: "expenses.manage",

  STOCK_COUNT_VIEW: "stock_count.view",
  STOCK_COUNT_PERFORM: "stock_count.perform",
  STOCK_COUNT_APPROVE: "stock_count.approve",

  MENU_VIEW: "menu.view",
  MENU_MANAGE: "menu.manage",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: Object.values(PERMISSIONS),

  manager: [
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_VOID_ORDER,
    PERMISSIONS.POS_REFUND,
    PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MANAGE,
    PERMISSIONS.INVENTORY_ADD_STOCK,
    PERMISSIONS.INVENTORY_ADJUST_STOCK,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_VIEW_ALL,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE,
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.HR_VIEW,
    PERMISSIONS.HR_APPROVE_LEAVE,
    PERMISSIONS.HR_APPROVE_CLAIMS,
    PERMISSIONS.HR_VIEW_ATTENDANCE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_SALES,
    PERMISSIONS.REPORTS_INVENTORY,
    PERMISSIONS.REPORTS_EMPLOYEE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_MANAGE,
    PERMISSIONS.STOCK_COUNT_VIEW,
    PERMISSIONS.STOCK_COUNT_PERFORM,
    PERMISSIONS.STOCK_COUNT_APPROVE,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_MANAGE,
  ],

  cashier: [
    PERMISSIONS.POS_ACCESS,
    PERMISSIONS.POS_DISCOUNT,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.MENU_VIEW,
  ],

  kitchen: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.MENU_VIEW],

  staff: [PERMISSIONS.POS_ACCESS, PERMISSIONS.ORDERS_VIEW],
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission))
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    "/pos": [PERMISSIONS.POS_ACCESS],
    "/inventory": [PERMISSIONS.INVENTORY_VIEW],
    "/customers": [PERMISSIONS.CUSTOMERS_VIEW],
    "/employees": [PERMISSIONS.EMPLOYEES_VIEW],
    "/hr": [PERMISSIONS.HR_VIEW],
    "/hr/employees": [PERMISSIONS.HR_VIEW],
    "/hr/attendance": [PERMISSIONS.HR_VIEW_ATTENDANCE],
    "/hr/leave": [PERMISSIONS.HR_VIEW],
    "/hr/claims": [PERMISSIONS.HR_VIEW],
    "/reports": [PERMISSIONS.REPORTS_VIEW],
    "/settings": [PERMISSIONS.SETTINGS_VIEW],
    "/suppliers": [PERMISSIONS.SUPPLIERS_VIEW],
    "/expenses": [PERMISSIONS.EXPENSES_VIEW],
    "/stock-count": [PERMISSIONS.STOCK_COUNT_VIEW],
    "/admin": [PERMISSIONS.MENU_VIEW, PERMISSIONS.INVENTORY_VIEW],
    "/admin/products": [PERMISSIONS.MENU_VIEW],
    "/admin/categories": [PERMISSIONS.MENU_VIEW],
    "/admin/modifiers": [PERMISSIONS.MENU_VIEW],
    "/admin/ingredients": [PERMISSIONS.INVENTORY_VIEW],
    "/admin/menu": [PERMISSIONS.MENU_VIEW],
  }

  const requiredPermissions = routePermissions[route]
  if (!requiredPermissions) return true

  return hasAnyPermission(userRole, requiredPermissions)
}

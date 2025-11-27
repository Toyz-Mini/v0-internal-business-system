// Caching utilities for common data lookups

import { createClient } from "@/lib/supabase/client"
import type { Product, Ingredient, Category, Customer, Employee, ModifierGroup } from "@/lib/types"

// Cache keys
const CACHE_KEYS = {
  PRODUCTS: "cache_products",
  INGREDIENTS: "cache_ingredients",
  CATEGORIES: "cache_categories",
  CUSTOMERS: "cache_customers",
  EMPLOYEES: "cache_employees",
  MODIFIER_GROUPS: "cache_modifier_groups",
} as const

// Cache TTL in milliseconds (5 minutes default)
const DEFAULT_TTL = 5 * 60 * 1000

interface CacheItem<T> {
  data: T
  timestamp: number
}

// Generic cache getter with TTL check
function getFromCache<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  if (typeof window === "undefined") return null

  try {
    const item = localStorage.getItem(key)
    if (!item) return null

    const cached: CacheItem<T> = JSON.parse(item)
    if (Date.now() - cached.timestamp > ttl) {
      localStorage.removeItem(key)
      return null
    }

    return cached.data
  } catch {
    return null
  }
}

// Generic cache setter
function setToCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return

  try {
    const item: CacheItem<T> = { data, timestamp: Date.now() }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    console.error("Cache write error:", error)
  }
}

// Clear specific cache
export function clearCache(key?: keyof typeof CACHE_KEYS): void {
  if (typeof window === "undefined") return

  if (key) {
    localStorage.removeItem(CACHE_KEYS[key])
  } else {
    Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k))
  }
}

// Products cache
export async function getProducts(forceRefresh = false): Promise<Product[]> {
  if (!forceRefresh) {
    const cached = getFromCache<Product[]>(CACHE_KEYS.PRODUCTS)
    if (cached) return cached
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("name")

  if (error) throw error

  const products = data || []
  setToCache(CACHE_KEYS.PRODUCTS, products)
  return products
}

// Ingredients cache
export async function getIngredients(forceRefresh = false): Promise<Ingredient[]> {
  if (!forceRefresh) {
    const cached = getFromCache<Ingredient[]>(CACHE_KEYS.INGREDIENTS)
    if (cached) return cached
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("ingredients")
    .select("*, supplier:suppliers(*)")
    .eq("is_active", true)
    .order("name")

  if (error) throw error

  const ingredients = data || []
  setToCache(CACHE_KEYS.INGREDIENTS, ingredients)
  return ingredients
}

// Categories cache
export async function getCategories(forceRefresh = false): Promise<Category[]> {
  if (!forceRefresh) {
    const cached = getFromCache<Category[]>(CACHE_KEYS.CATEGORIES)
    if (cached) return cached
  }

  const supabase = createClient()
  const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order")

  if (error) throw error

  const categories = data || []
  setToCache(CACHE_KEYS.CATEGORIES, categories)
  return categories
}

// Customers cache (shorter TTL since it changes more frequently)
export async function getCustomers(forceRefresh = false): Promise<Customer[]> {
  if (!forceRefresh) {
    const cached = getFromCache<Customer[]>(CACHE_KEYS.CUSTOMERS, 2 * 60 * 1000) // 2 min TTL
    if (cached) return cached
  }

  const supabase = createClient()
  const { data, error } = await supabase.from("customers").select("*").order("name")

  if (error) throw error

  const customers = data || []
  setToCache(CACHE_KEYS.CUSTOMERS, customers)
  return customers
}

// Employees cache
export async function getEmployees(forceRefresh = false): Promise<Employee[]> {
  if (!forceRefresh) {
    const cached = getFromCache<Employee[]>(CACHE_KEYS.EMPLOYEES)
    if (cached) return cached
  }

  const supabase = createClient()
  const { data, error } = await supabase.from("employees").select("*").eq("is_active", true).order("name")

  if (error) throw error

  const employees = data || []
  setToCache(CACHE_KEYS.EMPLOYEES, employees)
  return employees
}

// Modifier groups with options
export async function getModifierGroups(forceRefresh = false): Promise<ModifierGroup[]> {
  if (!forceRefresh) {
    const cached = getFromCache<ModifierGroup[]>(CACHE_KEYS.MODIFIER_GROUPS)
    if (cached) return cached
  }

  const supabase = createClient()
  const { data, error } = await supabase.from("modifier_groups").select("*, modifiers(*)")

  if (error) throw error

  const groups = data || []
  setToCache(CACHE_KEYS.MODIFIER_GROUPS, groups)
  return groups
}

// Invalidate cache after mutations
export function invalidateProductsCache(): void {
  clearCache("PRODUCTS")
}

export function invalidateIngredientsCache(): void {
  clearCache("INGREDIENTS")
}

export function invalidateCustomersCache(): void {
  clearCache("CUSTOMERS")
}

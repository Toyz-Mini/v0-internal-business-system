import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUnitLabel(unit: string): string {
  const unitMap: Record<string, string> = {
    kg: "kilogram",
    g: "gram",
    pcs: "pieces",
  }
  return unitMap[unit] || unit
}

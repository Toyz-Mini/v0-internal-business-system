"use client"

import { cn } from "@/lib/utils"
import type { Category } from "@/lib/types"

interface CategoryTabsProps {
  categories: Category[]
  selectedCategory: string | null
  onSelectCategory: (id: string | null) => void
}

export function CategoryTabs({ categories, selectedCategory, onSelectCategory }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b bg-background p-2">
      <button
        onClick={() => onSelectCategory(null)}
        className={cn(
          "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
          selectedCategory === null ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
        )}
      >
        Semua
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            selectedCategory === category.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}
